/**
 * Retrieval-Augmented Generation (RAG) pipeline.
 * Semantic search over KB document embeddings.
 *
 * Dois modos:
 * - DB habilitado (pgvector): embeddings persistidos em `agro.kb_embeddings`.
 *   Sobrevivem a cold starts — sem regeneração paga a cada request.
 * - Sem DB (dev): cache em memória module-level (perdido entre instâncias).
 *
 * A sincronização (`ensureKbEmbeddingsSeeded`) é idempotente: gera apenas os
 * docs ausentes ou com model_id diferente do configurado, upsertindo um a um
 * (resiliente a timeout em serverless).
 */

import { KNOWLEDGE_DOCUMENTS } from "../../../shared/agro/knowledge.js";
import type { KnowledgeDocument } from "../../../shared/agro/types.js";
import {
  generateEmbedding,
  generateEmbeddings,
  hasEmbeddingProvider,
  getEmbeddingModelId,
  type EmbeddingEntry,
} from "./embeddings.js";
import { isDbEnabled } from "../db/client.js";
import {
  dbUpsertKbEmbedding,
  dbDeleteKbEmbedding,
  dbListKbEmbeddingDocIds,
  dbSearchKbEmbeddings,
  dbListKnowledgeDocuments,
  dbGetKnowledgeDocument,
  type KbSearchHit,
} from "../db/repository.js";

/** Fonte dos documentos a indexar: DB quando habilitado, senão array estático. */
async function getKbDocs(): Promise<KnowledgeDocument[]> {
  if (isDbEnabled()) return dbListKnowledgeDocuments();
  return KNOWLEDGE_DOCUMENTS;
}

// ── In-memory vector store (fallback dev sem DB) ─────────────────────

let embeddingCache: EmbeddingEntry[] | null = null;

/**
 * Limite de caracteres do corpo concatenado no texto de embedding do modo
 * memória (dev sem DB — cache module-level, não é o caminho de produção).
 * ~24k chars ≈ 6k tokens, margem segura abaixo do limite do modelo (≈8191).
 */
const EMBED_BODY_MAX = 24_000;

/** Cabeçalho de metadados (título/tags/categoria/dados jurídicos) — repetido
 * em todo chunk para que cada um seja autodescritivo na busca semântica. */
function kbDocHeader(doc: KnowledgeDocument): string {
  let base = `${doc.title}: ${doc.summary}. Tags: ${doc.tags.join(", ")}. Categoria: ${doc.categoryId}`;
  const juridical = [
    doc.tribunal && `Tribunal: ${doc.tribunal}`,
    doc.relator && `Relator: ${doc.relator}`,
    doc.numeroProcesso && `Processo: ${doc.numeroProcesso}`,
    doc.dataJulgamento && `Julgamento: ${doc.dataJulgamento}`,
  ]
    .filter(Boolean)
    .join(". ");
  if (juridical) base += `. ${juridical}`;
  return base;
}

/** Texto único truncado — usado só pelo modo memória (dev, sem DB). */
function kbDocText(doc: KnowledgeDocument): string {
  const base = kbDocHeader(doc);
  const longText = doc.body?.trim() || doc.ementa?.trim();
  if (longText) {
    return `${base}\n\n${longText.slice(0, EMBED_BODY_MAX)}`;
  }
  return base;
}

// ── Chunking (modo DB / produção) ────────────────────────────────────

/** Tamanho alvo de cada chunk do corpo (chars). ~6k chars ≈ 1.5k tokens. */
const CHUNK_SIZE = 6_000;
/** Sobreposição entre chunks consecutivos — evita cortar contexto na fronteira. */
const CHUNK_OVERLAP = 400;
/** Teto de chunks por doc — cobre ~84k chars; além disso, truncamento (caso raro). */
const MAX_CHUNKS_PER_DOC = 15;
/**
 * Versão da estratégia de chunking. Bump força reseed em massa mesmo quando
 * model_id não mudou (o check de staleness por model_id sozinho não pegaria
 * docs já embeddados que precisam ser rechunkados).
 */
export const CURRENT_CHUNK_VERSION = 2;

/** Divide o doc em chunks embeddáveis. Docs curtos (guias/checklists) geram 1 só. */
function chunkKbDocText(doc: KnowledgeDocument): string[] {
  const header = kbDocHeader(doc);
  const longText = doc.body?.trim() || doc.ementa?.trim();
  if (!longText) return [header];
  if (longText.length <= CHUNK_SIZE) return [`${header}\n\n${longText}`];

  const chunks: string[] = [];
  let start = 0;
  while (start < longText.length && chunks.length < MAX_CHUNKS_PER_DOC) {
    const end = Math.min(start + CHUNK_SIZE, longText.length);
    chunks.push(`${header}\n\n${longText.slice(start, end)}`);
    if (end >= longText.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function ensureMemoryEmbeddings(): Promise<EmbeddingEntry[]> {
  if (embeddingCache) return embeddingCache;
  const texts = KNOWLEDGE_DOCUMENTS.map(kbDocText);
  const vectors = await Promise.all(texts.map((t) => generateEmbedding(t)));
  const entries: EmbeddingEntry[] = KNOWLEDGE_DOCUMENTS.map((doc, i) => ({
    id: doc.id,
    text: texts[i],
    vector: vectors[i],
  }));
  embeddingCache = entries;
  return entries;
}

// ── Cosine similarity (modo memória) ─────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Sincronização DB (pgvector) ──────────────────────────────────────

/** Progresso de uma passada de seed — permite chamar em loop até `done`. */
export interface KbSeedProgress {
  /** Total de docs que deveriam ter embedding com o model_id atual. */
  total: number;
  /** Docs que ainda precisavam de (re)geração no início desta passada. */
  pending: number;
  /** Docs gerados nesta passada (dentro do orçamento de tempo). */
  seeded: number;
  /** Docs ainda faltando após esta passada. */
  remaining: number;
  /** true quando não há mais nada a gerar. */
  done: boolean;
  /** Provider ausente — nada foi (nem será) gerado. */
  skipped?: boolean;
}

interface SeedOptions {
  /** Orçamento de tempo desta passada (ms). Para antes de estourar o limite serverless. */
  budgetMs?: number;
  /** Quantos docs processar em paralelo por rodada (cada um gera 1..N chunks). */
  docConcurrency?: number;
}

/**
 * Garante que `agro.kb_embeddings` cobre todos os documentos da KB com o
 * model_id configurado. Idempotente; gera apenas o que falta ou está com
 * model_id desatualizado.
 *
 * Em lotes (`embedMany`) e com orçamento de tempo: processa o máximo possível
 * dentro de `budgetMs` e retorna o progresso. Quando há muitos docs, chame em
 * loop (endpoint/cron) até `done === true`. Nunca fica no caminho de query.
 */
export async function ensureKbEmbeddingsSeeded(
  opts: SeedOptions = {},
): Promise<KbSeedProgress> {
  if (!hasEmbeddingProvider()) {
    return { total: 0, pending: 0, seeded: 0, remaining: 0, done: true, skipped: true };
  }
  const budgetMs = opts.budgetMs ?? 45_000;
  const docConcurrency = opts.docConcurrency ?? 4;
  const startedAt = Date.now();

  const currentModel = getEmbeddingModelId();
  const [docs, existingRows] = await Promise.all([
    getKbDocs(),
    dbListKbEmbeddingDocIds(),
  ]);
  const existing = new Map(existingRows.map((r) => [r.docId, r]));
  const toSeed = docs.filter((doc) => {
    const row = existing.get(doc.id);
    return !row || row.modelId !== currentModel || row.chunkVersion !== CURRENT_CHUNK_VERSION;
  });
  const total = docs.length;
  const pending = toSeed.length;

  if (pending === 0) {
    return { total, pending: 0, seeded: 0, remaining: 0, done: true };
  }
  console.log(
    `[RAG] (re)gerando até ${pending} embeddings KB (model=${currentModel}, chunkVersion=${CURRENT_CHUNK_VERSION}, budget=${budgetMs}ms)…`,
  );

  let seeded = 0;
  for (let i = 0; i < toSeed.length; i += docConcurrency) {
    if (Date.now() - startedAt > budgetMs) break;
    const group = toSeed.slice(i, i + docConcurrency);
    const results = await Promise.all(
      group.map(async (doc) => {
        // Blindado contra soluços de rede pontuais do Neon (fetch
        // failed/ECONNRESET): até 3 tentativas com backoff antes de
        // desistir desse doc — sem derrubar o Promise.all inteiro (os
        // demais docs do grupo seguem, mesmo padrão do backfill-kb-julgados).
        let lastErr: unknown;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const texts = chunkKbDocText(doc);
            const vectors = await generateEmbeddings(texts);
            // Limpa chunks antigos antes de reinserir — evita sobrar
            // chunk_index órfão quando o doc encolheu (menos chunks que na
            // versão anterior).
            await dbDeleteKbEmbedding(doc.id);
            await Promise.all(
              texts.map((text, chunkIndex) =>
                dbUpsertKbEmbedding({
                  docId: doc.id,
                  chunkIndex,
                  chunkVersion: CURRENT_CHUNK_VERSION,
                  modelId: currentModel,
                  embedding: vectors[chunkIndex],
                  text,
                  title: doc.title,
                  categoryId: doc.categoryId,
                }),
              ),
            );
            return true;
          } catch (err) {
            lastErr = err;
            if (attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 500));
            }
          }
        }
        console.error(
          `[RAG] falha ao (re)gerar embedding do doc ${doc.id} após 3 tentativas:`,
          lastErr,
        );
        return false;
      }),
    );
    seeded += results.filter(Boolean).length;
  }

  const remaining = pending - seeded;
  return { total, pending, seeded, remaining, done: remaining === 0 };
}

// ── Public API ──────────────────────────────────────────────────────

export interface RagResult {
  documentId: string;
  title: string;
  excerpt: string;
  /** Corpo completo do documento (quando houver), para fundamentar a resposta. */
  body?: string;
  categoryLabel: string;
  score: number;
}

async function searchViaDb(query: string, topK: number): Promise<RagResult[]> {
  // Busca roda só contra embeddings já persistidos. O seed é feito fora do
  // caminho de query (endpoint reindex/cron) para nunca bloquear a resposta.
  const queryVector = await generateEmbedding(query);
  const hits: KbSearchHit[] = await dbSearchKbEmbeddings(queryVector, topK);
  const { getKnowledgeCategory } = await import(
    "../../../shared/agro/knowledge.js"
  );
  const docs = await Promise.all(hits.map((hit) => dbGetKnowledgeDocument(hit.docId)));
  return hits.map((hit, i) => {
    const doc = docs[i];
    const category = doc ? getKnowledgeCategory(doc.categoryId) : null;
    return {
      documentId: hit.docId,
      title: doc?.title ?? hit.title ?? hit.docId,
      excerpt: doc?.summary ?? "",
      body: doc?.body,
      categoryLabel: category?.label ?? "",
      score: hit.score,
    };
  });
}

async function searchViaMemory(query: string, topK: number): Promise<RagResult[]> {
  const [queryVector, entries] = await Promise.all([
    generateEmbedding(query),
    ensureMemoryEmbeddings(),
  ]);
  const scored = entries.map((entry) => ({
    ...entry,
    score: cosineSimilarity(queryVector, entry.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  const { getKnowledgeDocument, getKnowledgeCategory } = await import(
    "../../../shared/agro/knowledge.js"
  );
  return scored.slice(0, topK).map((entry) => {
    const doc = getKnowledgeDocument(entry.id);
    const category = doc ? getKnowledgeCategory(doc.categoryId) : null;
    return {
      documentId: entry.id,
      title: doc?.title ?? entry.id,
      excerpt: doc?.summary ?? "",
      body: doc?.body,
      categoryLabel: category?.label ?? "",
      score: entry.score,
    };
  });
}

/**
 * Busca semântica sobre os documentos da base de conhecimento.
 * Retorna os top-k documentos mais relevantes para a query.
 */
export async function searchKnowledge(
  query: string,
  topK: number = 5,
): Promise<RagResult[]> {
  if (!hasEmbeddingProvider()) return [];
  try {
    if (isDbEnabled()) return await searchViaDb(query, topK);
    return await searchViaMemory(query, topK);
  } catch (err) {
    console.error("[RAG] busca de embeddings falhou, retornando vazio:", err);
    return [];
  }
}

/**
 * Limpa o cache em memória (modo dev sem DB). No-op no modo DB.
 */
export function clearEmbeddingCache(): void {
  embeddingCache = null;
}