/**
 * Embedding pipeline for the Knowledge Base.
 * Generates vector embeddings for KB documents using the configured provider.
 *
 * Supports: OpenAI, Google, Ollama (nomic-embed-text), OpenRouter.
 * Anthropic and Groq don't provide embedding APIs.
 */

import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// ── Types ──────────────────────────────────────────────────────────

export interface EmbeddingEntry {
  id: string;
  text: string;
  vector: number[];
}

// ── Provider ───────────────────────────────────────────────────────

function embeddingProviderId(): string {
  return process.env.COPILOT_EMBEDDINGS_PROVIDER ?? "openai";
}

function embeddingModelName(): string {
  return process.env.COPILOT_EMBEDDINGS_MODEL ?? "text-embedding-3-small";
}

/** Identificador estável do modelo para versionar embeddings persistidos. */
export function getEmbeddingModelId(): string {
  return `${embeddingProviderId()}:${embeddingModelName()}`;
}

function createEmbeddingModel() {
  const provider = embeddingProviderId();
  const modelId = embeddingModelName();

  switch (provider) {
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey)
        throw new Error("OPENAI_API_KEY is not set for embeddings");
      const openai = createOpenAI({ apiKey });
      return openai.embedding(modelId);
    }

    case "google": {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey)
        throw new Error(
          "GOOGLE_GENERATIVE_AI_API_KEY is not set for embeddings",
        );
      const google = createGoogleGenerativeAI({ apiKey });
      return google.embedding(modelId);
    }

    case "ollama": {
      const baseURL =
        process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
      const apiKey = process.env.OLLAMA_API_KEY ?? "ollama";
      const openai = createOpenAI({ apiKey, baseURL });
      return openai.embedding(modelId);
    }

    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey)
        throw new Error(
          "OPENROUTER_API_KEY is not set for embeddings",
        );
      const openai = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });
      return openai.embedding(modelId);
    }

    default:
      throw new Error(`Embeddings not supported for provider: ${provider}`);
  }
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Generate an embedding for a single text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = createEmbeddingModel();
  const { embedding } = await embed({ model, value: text });
  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch.
 */
export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  const results: number[][] = [];

  // Process in batches of 20 to avoid rate limits
  const batchSize = 20;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (text) => {
        const model = createEmbeddingModel();
        const { embedding } = await embed({ model, value: text });
        return embedding;
      }),
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check if embedding provider is configured.
 */
export function hasEmbeddingProvider(): boolean {
  const provider = process.env.COPILOT_EMBEDDINGS_PROVIDER;
  if (!provider) return false;

  switch (provider) {
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "google":
      return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    case "ollama":
      return !!(process.env.OLLAMA_API_KEY || process.env.OLLAMA_BASE_URL);
    case "openrouter":
      return !!process.env.OPENROUTER_API_KEY;
    default:
      return false;
  }
}
