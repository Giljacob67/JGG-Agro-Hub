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
  hasEmbeddingProvider,
  getEmbeddingModelId,
  type EmbeddingEntry,
} from "./embeddings.js";
import { isDbEnabled } from "../db/client.js";
import {
  dbUpsertKbEmbedding,
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
 * Limite de caracteres do corpo concatenado no texto de embedding.
 * Mantém abaixo do limite de tokens do modelo (text-embedding-3-small ≈ 8191).
 * ~24k chars ≈ 6k tokens, margem segura.
 */
const EMBED_BODY_MAX = 24_000;

function kbDocText(doc: KnowledgeDocument): string {
  const base = `${doc.title}: ${doc.summary}. Tags: ${doc.tags.join(", ")}. Categoria: ${doc.categoryId}`;
  if (doc.body && doc.body.trim()) {
    return `${base}\n\n${doc.body.slice(0, EMBED_BODY_MAX)}`;
  }
  return base;
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

/**
 * Garante que `agro.kb_embeddings` cobre todos os KNOWLEDGE_DOCUMENTS com o
 * model_id atualmente configurado. Idempotente; gera apenas o que falta ou
 * está com model_id desatualizado. No-op se não houver provider de embedding.
 */
export async function ensureKbEmbeddingsSeeded(): Promise<void> {
  if (!hasEmbeddingProvider()) return;
  const currentModel = getEmbeddingModelId();
  const [docs, existingRows] = await Promise.all([
    getKbDocs(),
    dbListKbEmbeddingDocIds(),
  ]);
  const existing = new Map(existingRows.map((r) => [r.docId, r.modelId]));
  const toSeed = docs.filter((doc) => existing.get(doc.id) !== currentModel);
  if (toSeed.length === 0) return;
  console.log(`[RAG] (re)gerando ${toSeed.length} embeddings KB (model=${currentModel})…`);
  for (const doc of toSeed) {
    const text = kbDocText(doc);
    const vector = await generateEmbedding(text);
    await dbUpsertKbEmbedding({
      docId: doc.id,
      modelId: currentModel,
      embedding: vector,
      text,
      title: doc.title,
      categoryId: doc.categoryId,
    });
  }
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
  const [queryVector] = await Promise.all([
    generateEmbedding(query),
    ensureKbEmbeddingsSeeded(),
  ]);
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