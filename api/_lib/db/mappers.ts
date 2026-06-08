import type {
  Account,
  Lead,
  Matter,
  Opportunity,
  Task,
} from "../../../shared/agro/types.js";
import { parseStringArray } from "./json-utils.js";

function toDateStr(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapLegacyOpportunityStage(stage: unknown): Opportunity["stage"] {
  const value = String(stage);
  if (value === "proposta") return "proposta_elaboracao";
  if (value === "qualificacao") return "diagnostico_agendado";
  return value as Opportunity["stage"];
}

export function mapLead(row: Record<string, unknown>): Lead {
  const lead: Lead = {
    id: String(row.id),
    name: String(row.name),
    contact: String(row.contact ?? ""),
    region: String(row.region),
    crop: String(row.crop ?? ""),
    source: String(row.source ?? ""),
    status: row.status as Lead["status"],
    owner: String(row.owner),
    createdAt: toDateStr(row.created_at),
    nextContact: row.next_contact ? toDateStr(row.next_contact) : null,
    notes: String(row.notes ?? ""),
    accountId: row.account_id ? String(row.account_id) : null,
  };

  if (row.lead_type) lead.leadType = String(row.lead_type);
  if (row.legal_pain) lead.legalPain = String(row.legal_pain);
  if (row.interest_area) lead.interestArea = String(row.interest_area);
  if (row.priority) lead.priority = row.priority as Lead["priority"];

  return lead;
}

export function mapAccount(row: Record<string, unknown>): Account {
  const account: Account = {
    id: String(row.id),
    name: String(row.name),
    type: row.type as Account["type"],
    region: String(row.region),
    areaHa: Number(row.area_ha ?? 0),
    mainCrop: String(row.main_crop ?? ""),
    owner: String(row.owner),
    activeMatters: Number(row.active_matters ?? 0),
    activeOpportunities: Number(row.active_opportunities ?? 0),
    since: String(row.since ?? ""),
  };

  const properties = parseStringArray(row.properties);
  const contacts = parseStringArray(row.contacts);
  const contractedAreas = parseStringArray(row.contracted_areas);
  const mappedRisks = parseStringArray(row.mapped_risks);

  if (properties?.length) account.properties = properties;
  if (contacts?.length) account.contacts = contacts;
  if (contractedAreas?.length) account.contractedAreas = contractedAreas;
  if (mappedRisks?.length) account.mappedRisks = mappedRisks;
  if (row.relationship_status) {
    account.relationshipStatus =
      row.relationship_status as Account["relationshipStatus"];
  }

  return account;
}

export function mapOpportunity(row: Record<string, unknown>): Opportunity {
  const opp: Opportunity = {
    id: String(row.id),
    title: String(row.title),
    accountName: String(row.account_name),
    accountId: row.account_id ? String(row.account_id) : undefined,
    stage: mapLegacyOpportunityStage(row.stage),
    valueBrl: Number(row.value_brl),
    owner: String(row.owner),
    expectedClose: toDateStr(row.expected_close),
    nextContact: row.next_contact ? toDateStr(row.next_contact) : null,
    priority: (row.priority as Opportunity["priority"]) ?? "normal",
    practice: String(row.practice ?? ""),
  };

  if (row.probability != null) opp.probability = Number(row.probability);
  if (row.next_step) opp.nextStep = String(row.next_step);

  return opp;
}

export function mapMatter(row: Record<string, unknown>): Matter {
  const matter: Matter = {
    id: String(row.id),
    title: String(row.title),
    accountName: String(row.account_name),
    accountId: row.account_id ? String(row.account_id) : undefined,
    practice: String(row.practice),
    status: row.status as Matter["status"],
    risk: row.risk as Matter["risk"],
    deadline: toDateStr(row.deadline),
    owner: String(row.owner),
    description: String(row.description ?? ""),
  };

  if (row.urgency) matter.urgency = row.urgency as Matter["urgency"];
  if (row.next_steps) matter.nextSteps = String(row.next_steps);

  const pendingDocuments = parseStringArray(row.pending_documents);
  if (pendingDocuments?.length) matter.pendingDocuments = pendingDocuments;

  return matter;
}

export function mapTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    relatedTo: String(row.related_to),
    type: row.type as Task["type"],
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    dueDate: toDateStr(row.due_date),
    owner: String(row.owner),
  };
}