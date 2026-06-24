/**
 * AI-assist para campos do CRM jurídico-agro.
 *
 * Quatro tarefas acionáveis ligadas a entidades (demanda, lead, oportunidade,
 * conta): resumo de demanda, rascunho de notas, enriquecer lead e próximos
 * passos. Reaproveita a camada LLM (resolveLlmConfig + generateText) e o
 * schema estruturado, sem RAG da base — o foco é o registro em mãos.
 */

import { z } from "zod";
import type { AiAssistTask } from "../../../shared/agro/types.js";

export const AiAssistResponseSchema = z.object({
  title: z
    .string()
    .describe("Título curto do resultado (máximo 8 palavras)."),
  content: z
    .string()
    .describe(
      "Texto principal em português brasileiro, objetivo e técnico. Máximo 3 parágrafos.",
    ),
  bullets: z
    .array(z.string())
    .max(8)
    .describe(
      "Itens acionáveis ou pontos-chave em ordem de prioridade (máximo 8).",
    ),
});

export type AiAssistLlmOutput = z.infer<typeof AiAssistResponseSchema>;

const SHARED_RULES = `
Regras obrigatórias:
1. Responda SEMPRE em português brasileiro.
2. Baseie-se apenas nos dados do registro fornecido; não invente fatos, valores, datas ou nomes ausentes.
3. Quando faltar informação relevante, aponte a lacuna como item acionável em vez de presumir.
4. Linguagem jurídica técnica, porém acessível e direta.
5. Conteúdo informativo — não substitui parecer de advogado responsável.`.trim();

const TASK_BRIEF: Record<AiAssistTask, string> = {
  summarize_matter:
    "Tarefa: produzir um RESUMO EXECUTIVO da demanda jurídica. Em 'content', sintetize objeto, partes, fase, risco e prazo crítico. Em 'bullets', destaque pontos de atenção e pendências.",
  draft_notes:
    "Tarefa: redigir um RASCUNHO DE NOTAS internas sobre o registro, pronto para o responsável revisar e completar. Em 'content', texto corrido em tom profissional. Em 'bullets', tópicos que ainda precisam ser confirmados.",
  enrich_lead:
    "Tarefa: ENRIQUECER o lead com leitura estratégica. Em 'content', avalie potencial, dor jurídica e aderência ao agronegócio. Em 'bullets', hipóteses de abordagem e dados a coletar antes do contato.",
  next_steps:
    "Tarefa: recomendar PRÓXIMOS PASSOS práticos para avançar o registro. Em 'content', breve justificativa do plano. Em 'bullets', ações concretas em ordem de prioridade.",
};

export function buildAssistSystemPrompt(task: AiAssistTask): string {
  return [
    "Você é o Agro Copilot — assistente jurídico do agronegócio brasileiro, integrado ao CRM interno.",
    TASK_BRIEF[task],
    SHARED_RULES,
    "Responda no formato estruturado solicitado (title, content, bullets).",
  ].join("\n\n");
}

/** Serializa o registro em pares legíveis, ignorando campos vazios/ruído. */
function describeEntity(entity: Record<string, unknown>): string {
  const SKIP = new Set([
    "deletedAt",
    "createdAt",
    "updatedAt",
    "versions",
  ]);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(entity)) {
    if (SKIP.has(key)) continue;
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    const rendered = Array.isArray(value) ? value.join("; ") : String(value);
    lines.push(`- ${key}: ${rendered}`);
  }
  return lines.join("\n");
}

export function buildAssistUserMessage(
  entityType: string,
  entity: Record<string, unknown> | null,
  extraContext?: string,
): string {
  const parts: string[] = [];
  if (entity) {
    parts.push(`Registro (${entityType}):\n${describeEntity(entity)}`);
  } else {
    parts.push(`Tipo de registro: ${entityType} (sem dados estruturados).`);
  }
  if (extraContext?.trim()) {
    parts.push(`Contexto adicional do usuário:\n${extraContext.trim()}`);
  }
  return parts.join("\n\n");
}
