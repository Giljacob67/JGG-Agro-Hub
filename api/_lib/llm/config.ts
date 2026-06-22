/**
 * Resolução de configuração runtime do Copilot (provider/model/temperature).
 *
 * Override de DB (agro.app_config, key "copilot.llm") sobre o default vindo
 * de env. Chaves de API NUNCA passam por aqui — só seleção entre providers
 * que já têm credencial no servidor (listAvailableProviders). A UI escolhe;
 * o segredo permanece server-side.
 */

import {
  getDefaultConfig,
  listAvailableProviders,
  type LlmConfig,
  type LlmProviderId,
} from "./providers.js";
import { isDbEnabled } from "../db/client.js";

export const LLM_CONFIG_KEY = "copilot.llm";

export const PROVIDER_LABELS: Record<LlmProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  google: "Google Gemini",
  ollama: "Ollama Cloud",
  groq: "Groq",
  openrouter: "OpenRouter",
};

interface StoredLlmConfig {
  provider: LlmProviderId;
  model: string;
  temperature?: number;
}

function isValidProvider(id: string): id is LlmProviderId {
  return id in PROVIDER_LABELS;
}

function clampTemperature(value: number | undefined): number {
  const t = value ?? 0.3;
  if (Number.isNaN(t)) return 0.3;
  return Math.min(1, Math.max(0, t));
}

/**
 * Config efetivo do Copilot: override de DB (se válido e provider disponível)
 * sobre o default de env. `source` indica a origem da config resolvida.
 */
export async function resolveLlmConfig(): Promise<{
  config: LlmConfig | null;
  source: "db" | "env" | "none";
}> {
  const available = listAvailableProviders();

  if (isDbEnabled()) {
    try {
      const { dbGetAppConfig } = await import("../db/repository.js");
      const stored = await dbGetAppConfig<StoredLlmConfig>(LLM_CONFIG_KEY);
      if (
        stored &&
        isValidProvider(stored.provider) &&
        stored.model &&
        available.includes(stored.provider)
      ) {
        return {
          config: {
            provider: stored.provider,
            model: stored.model,
            temperature: clampTemperature(stored.temperature),
          },
          source: "db",
        };
      }
    } catch (err) {
      console.error("[llm/config] falha ao ler override do DB:", err);
    }
  }

  const envConfig = getDefaultConfig();
  if (envConfig && available.includes(envConfig.provider)) {
    return { config: envConfig, source: "env" };
  }
  return { config: null, source: "none" };
}

/**
 * Persiste seleção de provider/model/temperature. Recusa provider sem
 * credencial no servidor e exige DB (config runtime não existe em modo
 * memória). Nunca recebe nem grava API keys.
 */
export async function setLlmConfig(
  input: { provider: string; model: string; temperature?: number },
  updatedBy: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidProvider(input.provider)) {
    return { ok: false, error: `Provider inválido: ${input.provider}` };
  }
  if (!input.model?.trim()) {
    return { ok: false, error: "model é obrigatório" };
  }
  if (!listAvailableProviders().includes(input.provider)) {
    return {
      ok: false,
      error: `Provider ${input.provider} não tem credencial configurada no servidor`,
    };
  }
  if (!isDbEnabled()) {
    return {
      ok: false,
      error: "Configuração runtime exige banco de dados (DATABASE_URL)",
    };
  }

  const { dbSetAppConfig } = await import("../db/repository.js");
  await dbSetAppConfig(
    LLM_CONFIG_KEY,
    {
      provider: input.provider,
      model: input.model.trim(),
      temperature: clampTemperature(input.temperature),
    },
    updatedBy,
  );
  return { ok: true };
}

/**
 * Snapshot para a UI: providers (com flag de disponibilidade), config atual,
 * origem, e status de embeddings. Nenhum segredo é exposto.
 */
export async function getCopilotConfigStatus() {
  const available = new Set(listAvailableProviders());
  const { config, source } = await resolveLlmConfig();

  const providers = (Object.keys(PROVIDER_LABELS) as LlmProviderId[]).map(
    (id) => ({ id, label: PROVIDER_LABELS[id], available: available.has(id) }),
  );

  const { hasEmbeddingProvider, getEmbeddingModelId } = await import(
    "./embeddings.js"
  );

  return {
    providers,
    current: config,
    source,
    dbEnabled: isDbEnabled(),
    embeddings: {
      modelId: getEmbeddingModelId(),
      available: hasEmbeddingProvider(),
    },
  };
}
