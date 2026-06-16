/**
 * Retrieval-Augmented Generation (RAG) pipeline.
 * Provides cosine similarity search over KB document embeddings.
 *
 * Embeddings are generated lazily on first query and cached in memory.
 * For production with large KBs, migrate to pgvector on Neon.
 */

import { KNOWLEDGE_DOCUMENTS } from "../../../shared/agro/knowledge.js";
import {
  generateEmbedding,
  hasEmbeddingProvider,
  type EmbeddingEntry,
} from "./embeddings.js";

// ── In-memory vector store ─────────────────────────────────────────

let embeddingCache: EmbeddingEntry[] | null = null;

/**
 * Build (or return cached) embeddings for all KB documents.
 */
async function ensureEmbeddings(): Promise<EmbeddingEntry[]> {
  if (embeddingCache) return embeddingCache;

  const entries: EmbeddingEntry[] = [];

  // Create text representation for each KB document
  const texts = KNOWLEDGE_DOCUMENTS.map(
    (doc) =>
      `${doc.title}: ${doc.summary}. Tags: ${doc.tags.join(", ")}. Categoria: ${doc.categoryId}`,
  );

  // Generate embeddings in batch
  const vectors = await Promise.all(texts.map((t) => generateEmbedding(t)));

  for (let i = 0; i < KNOWLEDGE_DOCUMENTS.length; i++) {
    entries.push({
      id: KNOWLEDGE_DOCUMENTS[i].id,
      text: texts[i],
      vector: vectors[i],
    });
  }

  embeddingCache = entries;
  return entries;
}

// ── Cosine similarity ──────────────────────────────────────────────

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

// ── Public API ─────────────────────────────────────────────────────

export interface RagResult {
  documentId: string;
  title: string;
  excerpt: string;
  categoryLabel: string;
  score: number;
}

/**
 * Semantic search over KB documents.
 * Returns top-k most relevant documents for a query.
 */
export async function searchKnowledge(
  query: string,
  topK: number = 5,
): Promise<RagResult[]> {
  if (!hasEmbeddingProvider()) {
    return [];
  }

  try {
    const [queryVector, entries] = await Promise.all([
      generateEmbedding(query),
      ensureEmbeddings(),
    ]);

    // Score all entries
    const scored = entries.map((entry) => ({
      ...entry,
      score: cosineSimilarity(queryVector, entry.vector),
    }));

    // Sort by score descending, return top-k
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
        categoryLabel: category?.label ?? "",
        score: entry.score,
      };
    });
  } catch (err) {
    console.error("[RAG] Embedding search failed, falling back to empty:", err);
    return [];
  }
}

/**
 * Clear the embedding cache (useful after KB updates).
 */
export function clearEmbeddingCache(): void {
  embeddingCache = null;
}
