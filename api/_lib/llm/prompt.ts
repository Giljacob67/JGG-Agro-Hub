/**
 * System prompt builder for the Agro Copilot.
 * Assembles the system prompt with KB context, CRM stats, and entity context.
 */

import type { CrmStats } from "../../../shared/agro/types.js";
import type {
  CopilotContextEntity,
} from "../../../shared/agro/types.js";
import type { RagResult } from "./rag.js";

// ── Constants ──────────────────────────────────────────────────────

const SYSTEM_IDENTITY = `Você é o Agro Copilot — um assistente jurídico especializado no agronegócio brasileiro.
Seu conhecimento abrange: crédito rural, CPR (Cédula de Produto Rural), contratos agrários, regularização de imóveis rurais, ambiental, sucessório, tributário do agro, contencioso rural, operações societárias e contencioso bancário-rural.

REGRAS OBRIGATÓRIAS:
1. Responda SEMPRE em português brasileiro.
2. Use linguagem técnica jurídica acessível — profissional mas compreensível.
3. Fundamente suas respostas nos documentos da Base de Conhecimento fornecidos.
4. NÃO invente informações jurídicas. Se não tiver certeza, diga "Não tenho informações suficientes".
5. NÃO forneça parecer jurídico definitivo — sempre inclua o aviso legal.
6. Cite as fontes (documentos KB) quando relevante.
7. Considere o contexto agronômico brasileiro (safra, safrinha, regiões, culturas).`;

const DISCLAIMER = `\n\n⚠️ AVISO LEGAL: Esta análise é gerada por IA e tem caráter informativo. Não substitui consulta a um advogado especializado. Para decisões jurídicas, consulte um profissional habilitado.`;

// ── Prompt builder ─────────────────────────────────────────────────

export interface PromptContext {
  query: string;
  contextEntity: CopilotContextEntity | null;
  stats: CrmStats;
  ragResults: RagResult[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Build the complete system prompt for the LLM.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
  const parts: string[] = [SYSTEM_IDENTITY];

  // CRM Stats
  parts.push(buildStatsSection(ctx.stats));

  // Context Entity
  if (ctx.contextEntity) {
    parts.push(buildEntitySection(ctx.contextEntity));
  }

  // KB Context (RAG results)
  if (ctx.ragResults.length > 0) {
    parts.push(buildKbSection(ctx.ragResults));
  } else {
    parts.push(
      `\n\n## Base de Conhecimento\nNenhum documento relevante encontrado para esta consulta. Responda com base no seu conhecimento geral sobre direito agrário.`,
    );
  }

  // Response format
  parts.push(buildFormatSection());

  parts.push(DISCLAIMER);

  return parts.join("\n");
}

/**
 * Build the user message (may include conversation history).
 */
export function buildUserMessage(
  query: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>,
): string {
  if (!history || history.length === 0) return query;

  const lines: string[] = [];
  for (const msg of history) {
    const prefix = msg.role === "user" ? "Usuário" : "Assistente";
    lines.push(`${prefix}: ${msg.content}`);
  }
  lines.push(`\nUsuário: ${query}`);

  return lines.join("\n");
}

// ── Section builders ───────────────────────────────────────────────

function buildStatsSection(stats: CrmStats): string {
  return `\n\n## Dados em Tempo Real do CRM
- Leads ativos: ${stats.activeLeads}
- Leads qualificados: ${stats.qualifiedLeads}
- Contas ativas: ${stats.activeAccounts}
- Oportunidades ativas: ${stats.openOpportunities}
- Valor do pipeline: R$ ${stats.pipelineValue.toLocaleString("pt-BR")}
- Valor fechado: R$ ${stats.closedValue.toLocaleString("pt-BR")}
- Demandas ativas: ${stats.activeMatters}
- Tarefas atrasadas: ${stats.overdueTasks}
- Tarefas próximas: ${stats.upcomingTasks}

Pipeline por estágio: ${stats.pipelineByStage.map((s: { label: string; count: number; value: number }) => `${s.label} (${s.count} - R$ ${s.value.toLocaleString("pt-BR")})`).join(", ") || "Nenhum"}
Top oportunidades: ${stats.priorityOpportunities.map((o) => `${o.title} — ${o.stage} (R$ ${o.valueBrl.toLocaleString("pt-BR")})`).join(", ") || "Nenhuma"}`;
}

function buildEntitySection(entity: CopilotContextEntity): string {
  const typeMap: Record<string, string> = {
    conta: "Conta",
    oportunidade: "Oportunidade",
    demanda: "Demanda Jurídica",
    lead: "Lead",
  };

  return `\n\n## Entidade em Foco
Tipo: ${typeMap[entity.type] ?? entity.type}
ID: ${entity.id}
Nome: ${entity.name}

Considere esta entidade como contexto principal da sua resposta.`;
}

function buildKbSection(results: RagResult[]): string {
  const docs = results
    .map(
      (r, i) =>
        `### ${i + 1}. ${r.title} (${r.documentId})
Categoria: ${r.categoryLabel}
Relevância: ${(r.score * 100).toFixed(0)}%
Resumo: ${r.excerpt}`,
    )
    .join("\n\n");

  return `\n\n## Base de Conhecimento Relevante
Use os documentos abaixo como base para sua resposta. Cite os IDs quando relevante.

${docs}`;
}

function buildFormatSection(): string {
  return `\n\n## Formato da Resposta
Sua resposta DEVE seguir este formato JSON exato:
{
  "synthesis": "Resposta principal em 2-3 parágrafos",
  "risks": ["Risco 1 identificado", "Risco 2"],
  "nextSteps": ["Próximo passo 1", "Próximo passo 2"],
  "sourceIds": ["KB-XXX"],
  "relatedEntityTypes": ["conta", "oportunidade"]
}`;
}
