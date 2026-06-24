/**
 * Multi-provider LLM factory using Vercel AI SDK v6.
 * Supports: OpenAI, Anthropic, Google, Ollama Cloud, Groq, OpenRouter.
 *
 * Each provider returns a function (modelId) => LanguageModel.
 */

import { generateText, Output, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// ── Types ──────────────────────────────────────────────────────────

export type LlmProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "ollama"
  | "groq"
  | "openrouter";

export interface LlmConfig {
  provider: LlmProviderId;
  model: string;
  temperature?: number;
}

export interface LlmResult {
  text: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}

// ── Provider factory ───────────────────────────────────────────────

/**
 * Create a LanguageModel factory for the given provider.
 * Usage: const model = createProvider("openai"); await generateText({ model: model("gpt-5.4"), ... });
 */
export function createProvider(providerId: LlmProviderId) {
  switch (providerId) {
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
      const openai = createOpenAI({ apiKey });
      return (modelId: string): LanguageModel => openai(modelId);
    }

    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
      const anthropic = createAnthropic({ apiKey });
      return (modelId: string): LanguageModel => anthropic(modelId);
    }

    case "google": {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
      const google = createGoogleGenerativeAI({ apiKey });
      return (modelId: string): LanguageModel => google(modelId);
    }

    case "ollama": {
      // `||` (não `??`): trata string vazia como ausente e cai no Ollama Cloud.
      const apiKey = process.env.OLLAMA_API_KEY || "ollama";
      const baseURL = process.env.OLLAMA_BASE_URL || "https://ollama.com/v1";
      const openai = createOpenAI({ apiKey, baseURL });
      return (modelId: string): LanguageModel => openai(modelId);
    }

    case "groq": {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY is not set");
      const groq = createOpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
      });
      return (modelId: string): LanguageModel => groq(modelId);
    }

    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
      const openrouter = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });
      return (modelId: string): LanguageModel => openrouter(modelId);
    }

    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Get the configured default provider and model from env vars.
 * Returns null if no LLM provider is configured.
 */
export function getDefaultConfig(): LlmConfig | null {
  const provider = (process.env.COPILOT_PROVIDER ?? "") as LlmProviderId;
  const model = process.env.COPILOT_MODEL ?? "";

  if (!provider || !model) return null;

  return { provider, model, temperature: 0.3 };
}

/**
 * Generate text with system prompt using the configured LLM provider.
 */
export async function generateWithSystem(
  config: LlmConfig,
  system: string,
  userMessage: string,
): Promise<LlmResult> {
  const modelFactory = createProvider(config.provider);

  const result = await generateText({
    model: modelFactory(config.model),
    system,
    prompt: userMessage,
    temperature: config.temperature ?? 0.3,
  });

  return {
    text: result.text,
    usage: {
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0,
    },
    model: config.model,
  };
}

/**
 * Generate structured output using Output.object() with AI SDK v6.
 */
export async function generateStructured<T>(
  config: LlmConfig,
  system: string,
  userMessage: string,
  schema: ReturnType<typeof Output.object> extends { output: infer O } ? O : never,
): Promise<{ output: T; usage: { promptTokens: number; completionTokens: number } }> {
  const modelFactory = createProvider(config.provider);

  const result = await generateText({
    model: modelFactory(config.model),
    system,
    prompt: userMessage,
    output: schema,
    temperature: config.temperature ?? 0.3,
  });

  return {
    output: result.output as T,
    usage: {
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0,
    },
  };
}

/**
 * List available providers (checks env vars).
 */
export function listAvailableProviders(): LlmProviderId[] {
  const providers: LlmProviderId[] = [];

  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.ANTHROPIC_API_KEY) providers.push("anthropic");
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) providers.push("google");
  if (process.env.OLLAMA_API_KEY || process.env.OLLAMA_BASE_URL)
    providers.push("ollama");
  if (process.env.GROQ_API_KEY) providers.push("groq");
  if (process.env.OPENROUTER_API_KEY) providers.push("openrouter");

  return providers;
}
