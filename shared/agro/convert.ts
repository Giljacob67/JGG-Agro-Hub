import type { Lead, Opportunity } from "./types.js";

export interface ConvertLeadInput {
  title?: string;
  valueBrl?: number;
  practice?: string;
  owner?: string;
  expectedClose?: string;
}

export type ConvertLeadResult =
  | { ok: true; lead: Lead; opportunity: Opportunity }
  | { ok: false; reason: "not_found" | "already_converted" | "discarded" };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultExpectedClose(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
}

/**
 * Monta a oportunidade derivada de um lead. Pura — quem persiste é o
 * chamador (store em memória ou repositório Postgres).
 */
export function buildOpportunityFromLead(
  lead: Lead,
  id: string,
  input: ConvertLeadInput = {},
): Opportunity {
  return {
    id,
    title:
      input.title ??
      `${lead.interestArea || lead.legalPain || "Nova oportunidade"} — ${lead.name}`,
    accountName: lead.name,
    accountId: lead.accountId ?? undefined,
    stage: "novo_contato",
    valueBrl: input.valueBrl ?? 0,
    owner: input.owner ?? lead.owner,
    expectedClose: input.expectedClose ?? defaultExpectedClose(),
    nextContact: lead.nextContact,
    priority: lead.priority === "alta" ? "alta" : "normal",
    practice: input.practice ?? lead.interestArea ?? "",
    leadId: lead.id,
  };
}

export function conversionBlockReason(
  lead: Lead | undefined | null,
): Extract<ConvertLeadResult, { ok: false }>["reason"] | null {
  if (!lead) return "not_found";
  if (lead.convertedOpportunityId) return "already_converted";
  if (lead.status === "descartado") return "discarded";
  return null;
}

export function conversionActivitySummary(opportunityId: string): string {
  return `Lead convertido em oportunidade ${opportunityId}.`;
}

export { todayIso };
