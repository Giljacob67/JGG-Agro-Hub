import type {
  ActivityEntityType,
  ActivityType,
  ContactRole,
  DeadlineStatus,
  DeadlineType,
  DocumentCategory,
  DocumentEntityType,
  DocumentStatus,
  LeadPriority,
  LeadStatus,
  MatterPhase,
  MatterStatus,
  MatterUrgency,
  OpportunityPriority,
  OpportunityStage,
  PropertyType,
  RiskLevel,
  TaskPriority,
  TaskStatus,
  TimeEntryType,
} from "../../shared/agro/types.js";
import { KNOWLEDGE_CATEGORIES } from "../../shared/agro/knowledge.js";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type Body = Record<string, unknown>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const LEAD_STATUSES = ["novo", "qualificando", "qualificado", "descartado"] as const;
const LEAD_PRIORITIES = ["baixa", "media", "alta"] as const;
const OPPORTUNITY_STAGES = [
  "novo_contato",
  "diagnostico_agendado",
  "diagnostico_realizado",
  "proposta_elaboracao",
  "proposta_enviada",
  "negociacao",
  "contrato",
  "perdido",
  "arquivado",
] as const;
const OPPORTUNITY_PRIORITIES = ["normal", "alta"] as const;
const MATTER_STATUSES = ["aberta", "em_andamento", "aguardando", "concluida"] as const;
const RISK_LEVELS = ["baixo", "medio", "alto", "critico"] as const;
const MATTER_PHASES = [
  "consultivo",
  "extrajudicial",
  "conhecimento",
  "recursal",
  "execucao",
  "cumprimento_sentenca",
] as const;
const TASK_STATUSES = ["pendente", "em_andamento", "concluida", "atrasada"] as const;
const DEADLINE_TYPES = ["fatal", "ordinatorio"] as const;
const DEADLINE_STATUSES = ["pendente", "cumprido", "cancelado"] as const;
const ACTIVITY_ENTITY_TYPES = ["lead", "account", "opportunity", "matter"] as const;
const ACTIVITY_TYPES = [
  "ligacao",
  "reuniao",
  "email",
  "whatsapp",
  "visita",
  "nota",
  "sistema",
] as const;

function isRecord(value: unknown): value is Body {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function getBody(value: unknown): Body {
  return isRecord(value) ? value : {};
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): ValidationResult<T[number] | undefined> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, data: undefined };
  }
  const stringValue = String(value);
  if ((allowed as readonly string[]).includes(stringValue)) {
    return { ok: true, data: stringValue as T[number] };
  }
  return { ok: false, error: `${field} inválido` };
}

function requiredString(body: Body, field: string): ValidationResult<string> {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: `${field} é obrigatório` };
  }
  return { ok: true, data: value.trim() };
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function optionalNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function optionalDate(value: unknown, field: string): ValidationResult<string | null | undefined> {
  if (value === undefined) return { ok: true, data: undefined };
  if (value === null || value === "") return { ok: true, data: null };
  const date = String(value);
  if (!ISO_DATE_RE.test(date)) return { ok: false, error: `${field} deve usar YYYY-MM-DD` };
  return { ok: true, data: date };
}

function optionalNumber(value: unknown, field: string): ValidationResult<number | null | undefined> {
  if (value === undefined) return { ok: true, data: undefined };
  if (value === null || value === "") return { ok: true, data: null };
  const number = Number(value);
  if (!Number.isFinite(number)) return { ok: false, error: `${field} deve ser numérico` };
  return { ok: true, data: number };
}

export function parseLeadCreate(body: Body) {
  const name = requiredString(body, "name");
  if (!name.ok) return name;
  const region = requiredString(body, "region");
  if (!region.ok) return region;
  const owner = requiredString(body, "owner");
  if (!owner.ok) return owner;

  const status = enumValue(body.status, LEAD_STATUSES, "status");
  if (!status.ok) return status;
  const priority = enumValue(body.priority, LEAD_PRIORITIES, "priority");
  if (!priority.ok) return priority;
  const nextContact = optionalDate(body.nextContact, "nextContact");
  if (!nextContact.ok) return nextContact;

  return {
    ok: true,
    data: {
      name: name.data,
      contact: optionalString(body.contact) ?? "",
      region: region.data,
      crop: optionalString(body.crop) ?? "",
      source: optionalString(body.source) ?? "Manual",
      owner: owner.data,
      notes: optionalString(body.notes) ?? "",
      nextContact: nextContact.data ?? null,
      accountId: optionalNullableString(body.accountId) ?? null,
      status: status.data as LeadStatus | undefined,
      leadType: optionalString(body.leadType),
      legalPain: optionalString(body.legalPain),
      interestArea: optionalString(body.interestArea),
      priority: priority.data as LeadPriority | undefined,
      phone: optionalString(body.phone),
      email: optionalString(body.email),
      cnpj: optionalString(body.cnpj),
      cpf: optionalString(body.cpf),
      address: optionalString(body.address),
      listId: optionalNullableString(body.listId) ?? null,
    },
  } satisfies ValidationResult<unknown>;
}

export function parseLeadPatch(body: Body) {
  const status = enumValue(body.status, LEAD_STATUSES, "status");
  if (!status.ok) return status;
  const nextContact = optionalDate(body.nextContact, "nextContact");
  if (!nextContact.ok) return nextContact;
  return {
    ok: true,
    data: {
      ...(status.data ? { status: status.data as LeadStatus } : {}),
      ...(body.owner !== undefined ? { owner: String(body.owner) } : {}),
      ...(body.nextContact !== undefined ? { nextContact: nextContact.data ?? null } : {}),
      ...(body.notes !== undefined ? { notes: String(body.notes) } : {}),
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.listId !== undefined ? { listId: optionalNullableString(body.listId) ?? null } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseLeadListCreate(body: Body) {
  const name = requiredString(body, "name");
  if (!name.ok) return name;
  return {
    ok: true,
    data: {
      name: name.data,
      description: optionalString(body.description),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseLeadListPatch(
  body: Body,
): ValidationResult<{ name?: string; description?: string }> {
  return {
    ok: true,
    data: {
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.description !== undefined ? { description: optionalString(body.description) } : {}),
    },
  };
}

export function parseLeadConversion(body: Body) {
  const valueBrl = optionalNumber(body.valueBrl, "valueBrl");
  if (!valueBrl.ok) return valueBrl;
  const expectedClose = optionalDate(body.expectedClose, "expectedClose");
  if (!expectedClose.ok) return expectedClose;
  return {
    ok: true,
    data: {
      title: optionalString(body.title),
      valueBrl: valueBrl.data ?? undefined,
      practice: optionalString(body.practice),
      owner: optionalString(body.owner),
      expectedClose: expectedClose.data ?? undefined,
    },
  } satisfies ValidationResult<unknown>;
}

export function parseOpportunityPatch(body: Body) {
  const stage = enumValue(body.stage, OPPORTUNITY_STAGES, "stage");
  if (!stage.ok) return stage;
  const priority = enumValue(body.priority, OPPORTUNITY_PRIORITIES, "priority");
  if (!priority.ok) return priority;
  const nextContact = optionalDate(body.nextContact, "nextContact");
  if (!nextContact.ok) return nextContact;
  return {
    ok: true,
    data: {
      ...(stage.data ? { stage: stage.data as OpportunityStage } : {}),
      ...(priority.data ? { priority: priority.data as OpportunityPriority } : {}),
      ...(body.nextContact !== undefined ? { nextContact: nextContact.data ?? null } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseMatterPatch(body: Body) {
  const status = enumValue(body.status, MATTER_STATUSES, "status");
  if (!status.ok) return status;
  const risk = enumValue(body.risk, RISK_LEVELS, "risk");
  if (!risk.ok) return risk;
  const phase = enumValue(body.phase, MATTER_PHASES, "phase");
  if (!phase.ok) return phase;
  const claimValueBrl = optionalNumber(body.claimValueBrl, "claimValueBrl");
  if (!claimValueBrl.ok) return claimValueBrl;
  return {
    ok: true,
    data: {
      ...(status.data ? { status: status.data as MatterStatus } : {}),
      ...(risk.data ? { risk: risk.data as RiskLevel } : {}),
      ...(body.cnjNumber !== undefined ? { cnjNumber: optionalNullableString(body.cnjNumber) } : {}),
      ...(body.court !== undefined ? { court: optionalNullableString(body.court) } : {}),
      ...(body.phase !== undefined ? { phase: (phase.data as MatterPhase | undefined) ?? null } : {}),
      ...(body.opposingParty !== undefined
        ? { opposingParty: optionalNullableString(body.opposingParty) }
        : {}),
      ...(body.claimValueBrl !== undefined ? { claimValueBrl: claimValueBrl.data ?? null } : {}),
      ...(body.opportunityId !== undefined
        ? { opportunityId: optionalNullableString(body.opportunityId) }
        : {}),
      ...(body.nextSteps !== undefined ? { nextSteps: optionalNullableString(body.nextSteps) } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseTaskStatusPatch(body: Body) {
  const status = enumValue(body.status, TASK_STATUSES, "status");
  if (!status.ok) return status;
  if (!status.data) return { ok: false, error: "status é obrigatório" } as const;
  return { ok: true, data: status.data as TaskStatus } as const;
}

export function parseDeadlineCreate(body: Body) {
  const matterId = requiredString(body, "matterId");
  if (!matterId.ok) return matterId;
  const title = requiredString(body, "title");
  if (!title.ok) return title;
  const owner = requiredString(body, "owner");
  if (!owner.ok) return owner;
  const type = enumValue(body.type, DEADLINE_TYPES, "type");
  if (!type.ok) return type;
  if (!type.data) return { ok: false, error: "type é obrigatório" } as const;
  const dueDate = optionalDate(body.dueDate, "dueDate");
  if (!dueDate.ok) return dueDate;
  if (!dueDate.data) return { ok: false, error: "dueDate é obrigatório" } as const;
  return {
    ok: true,
    data: {
      matterId: matterId.data,
      title: title.data,
      type: type.data as DeadlineType,
      dueDate: dueDate.data,
      owner: owner.data,
      notes: optionalString(body.notes),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseDeadlinePatch(body: Body) {
  const status = enumValue(body.status, DEADLINE_STATUSES, "status");
  if (!status.ok) return status;
  const dueDate = optionalDate(body.dueDate, "dueDate");
  if (!dueDate.ok) return dueDate;
  if (body.dueDate !== undefined && !dueDate.data) {
    return { ok: false, error: "dueDate deve usar YYYY-MM-DD" } as const;
  }
  const completedAt = optionalDate(body.completedAt, "completedAt");
  if (!completedAt.ok) return completedAt;
  return {
    ok: true,
    data: {
      ...(status.data ? { status: status.data as DeadlineStatus } : {}),
      ...(body.dueDate !== undefined ? { dueDate: dueDate.data as string } : {}),
      ...(body.completedAt !== undefined ? { completedAt: completedAt.data ?? null } : {}),
      ...(body.owner !== undefined ? { owner: String(body.owner) } : {}),
      ...(body.notes !== undefined ? { notes: optionalNullableString(body.notes) } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseActivityCreate(body: Body) {
  const entityId = requiredString(body, "entityId");
  if (!entityId.ok) return entityId;
  const summary = requiredString(body, "summary");
  if (!summary.ok) return summary;
  const owner = requiredString(body, "owner");
  if (!owner.ok) return owner;
  const entityType = enumValue(body.entityType, ACTIVITY_ENTITY_TYPES, "entityType");
  if (!entityType.ok) return entityType;
  if (!entityType.data) return { ok: false, error: "entityType é obrigatório" } as const;
  const type = enumValue(body.type, ACTIVITY_TYPES, "type");
  if (!type.ok) return type;
  if (!type.data) return { ok: false, error: "type é obrigatório" } as const;
  const date = optionalDate(body.date, "date");
  if (!date.ok) return date;
  return {
    ok: true,
    data: {
      entityType: entityType.data as ActivityEntityType,
      entityId: entityId.data,
      type: type.data as ActivityType,
      summary: summary.data,
      date: date.data ?? undefined,
      owner: owner.data,
    },
  } satisfies ValidationResult<unknown>;
}

export function isActivityEntityType(value: unknown): value is ActivityEntityType {
  return (ACTIVITY_ENTITY_TYPES as readonly string[]).includes(String(value));
}

const ACCOUNT_TYPES = ["produtor", "familia", "cooperativa", "agroindustria", "trading", "investidor"] as const;
const TASK_PRIORITIES = ["baixa", "media", "alta", "urgente"] as const;
const TASK_TYPES = ["comercial", "juridica", "operacional"] as const;
const MATTER_URGENCIES = ["normal", "alta", "critica"] as const;
const JURISDICTIONS = ["federal", "estadual", "trabalhista", "arbitral"] as const;

export function parseAccountCreate(body: Body) {
  const name = requiredString(body, "name");
  if (!name.ok) return name;
  const owner = requiredString(body, "owner");
  if (!owner.ok) return owner;
  const type = enumValue(body.type, ACCOUNT_TYPES, "type");
  if (!type.ok) return type;
  return {
    ok: true,
    data: {
      name: name.data,
      type: (type.data as string) ?? "produtor",
      region: optionalString(body.region) ?? "",
      areaHa: Number(body.areaHa) || 0,
      mainCrop: optionalString(body.mainCrop) ?? "",
      owner: owner.data,
      cnpj: optionalString(body.cnpj),
      cpf: optionalString(body.cpf),
      phone: optionalString(body.phone),
      email: optionalString(body.email),
      address: optionalString(body.address),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseAccountPatch(body: Body) {
  const type = enumValue(body.type, ACCOUNT_TYPES, "type");
  if (!type.ok) return type;
  return {
    ok: true,
    data: {
      ...(type.data ? { type: type.data } : {}),
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.region !== undefined ? { region: String(body.region) } : {}),
      ...(body.areaHa !== undefined ? { areaHa: Number(body.areaHa) || 0 } : {}),
      ...(body.mainCrop !== undefined ? { mainCrop: String(body.mainCrop) } : {}),
      ...(body.owner !== undefined ? { owner: String(body.owner) } : {}),
      ...(body.relationshipStatus !== undefined ? { relationshipStatus: String(body.relationshipStatus) } : {}),
      ...(body.cnpj !== undefined ? { cnpj: optionalString(body.cnpj) } : {}),
      ...(body.phone !== undefined ? { phone: optionalString(body.phone) } : {}),
      ...(body.email !== undefined ? { email: optionalString(body.email) } : {}),
      ...(body.address !== undefined ? { address: optionalString(body.address) } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseOpportunityCreate(body: Body) {
  const title = requiredString(body, "title");
  if (!title.ok) return title;
  const owner = requiredString(body, "owner");
  if (!owner.ok) return owner;
  const stage = enumValue(body.stage, OPPORTUNITY_STAGES, "stage");
  if (!stage.ok) return stage;
  const valueBrl = optionalNumber(body.valueBrl, "valueBrl");
  if (!valueBrl.ok) return valueBrl;
  const expectedClose = optionalDate(body.expectedClose, "expectedClose");
  if (!expectedClose.ok) return expectedClose;
  return {
    ok: true,
    data: {
      title: title.data,
      accountName: optionalString(body.accountName) ?? "",
      accountId: optionalString(body.accountId),
      stage: (stage.data as OpportunityStage) ?? "novo_contato",
      valueBrl: valueBrl.data ?? 0,
      owner: owner.data,
      expectedClose: expectedClose.data ?? "",
      nextContact: null,
      priority: (body.priority as string) === "alta" ? "alta" : "normal",
      practice: optionalString(body.practice) ?? "",
      description: optionalString(body.description),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseMatterCreate(body: Body) {
  const title = requiredString(body, "title");
  if (!title.ok) return title;
  const owner = requiredString(body, "owner");
  if (!owner.ok) return owner;
  const status = enumValue(body.status, MATTER_STATUSES, "status");
  if (!status.ok) return status;
  const risk = enumValue(body.risk, RISK_LEVELS, "risk");
  if (!risk.ok) return risk;
  const deadline = optionalDate(body.deadline, "deadline");
  if (!deadline.ok) return deadline;
  const urgency = enumValue(body.urgency, MATTER_URGENCIES, "urgency");
  if (!urgency.ok) return urgency;
  const jurisdiction = enumValue(body.jurisdiction, JURISDICTIONS, "jurisdiction");
  if (!jurisdiction.ok) return jurisdiction;
  const nextHearingDate = optionalDate(body.nextHearingDate, "nextHearingDate");
  if (!nextHearingDate.ok) return nextHearingDate;
  return {
    ok: true,
    data: {
      title: title.data,
      accountName: optionalString(body.accountName) ?? "",
      accountId: optionalString(body.accountId),
      practice: optionalString(body.practice) ?? "",
      status: (status.data as MatterStatus) ?? "aberta",
      risk: (risk.data as RiskLevel) ?? "baixo",
      deadline: deadline.data ?? "",
      owner: owner.data,
      description: optionalString(body.description) ?? "",
      urgency: (urgency.data as MatterUrgency) ?? "normal",
      cnjNumber: optionalString(body.cnjNumber),
      court: optionalString(body.court),
      opposingParty: optionalString(body.opposingParty),
      clientLawyer: optionalString(body.clientLawyer),
      opposingLawyer: optionalString(body.opposingLawyer),
      nextHearingDate: nextHearingDate.data ?? null,
      jurisdiction: (jurisdiction.data as string) ?? undefined,
      parentMatterId: optionalString(body.parentMatterId),
      relationType: optionalString(body.relationType),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseTaskCreate(body: Body) {
  const title = requiredString(body, "title");
  if (!title.ok) return title;
  const owner = requiredString(body, "owner");
  if (!owner.ok) return owner;
  const type = enumValue(body.type, TASK_TYPES, "type");
  if (!type.ok) return type;
  const priority = enumValue(body.priority, TASK_PRIORITIES, "priority");
  if (!priority.ok) return priority;
  const dueDate = optionalDate(body.dueDate, "dueDate");
  if (!dueDate.ok) return dueDate;
  return {
    ok: true,
    data: {
      title: title.data,
      relatedTo: optionalString(body.relatedTo) ?? "",
      type: (type.data as string) ?? "operacional",
      priority: (priority.data as TaskPriority) ?? "media",
      dueDate: dueDate.data ?? "",
      owner: owner.data,
      description: optionalString(body.description),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseTaskPatch(body: Body) {
  const status = enumValue(body.status, TASK_STATUSES, "status");
  if (!status.ok) return status;
  const priority = enumValue(body.priority, TASK_PRIORITIES, "priority");
  if (!priority.ok) return priority;
  const dueDate = optionalDate(body.dueDate, "dueDate");
  if (!dueDate.ok) return dueDate;
  return {
    ok: true,
    data: {
      ...(status.data ? { status: status.data as TaskStatus } : {}),
      ...(priority.data ? { priority: priority.data as TaskPriority } : {}),
      ...(body.title !== undefined ? { title: String(body.title) } : {}),
      ...(body.owner !== undefined ? { owner: String(body.owner) } : {}),
      ...(body.dueDate !== undefined ? { dueDate: dueDate.data ?? "" } : {}),
      ...(body.description !== undefined ? { description: optionalString(body.description) } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

// ── 12 recursos restantes (E-5: validação de payload) ───────────────
// Antes destes validators, os 12 recursos abaixo usavam `getBody(req.body) as
// any` e aceitavam qualquer string em campos de enum (status/type/category/
// risk), corrompendo dados que filtros/stats/audit assumem válidos.

const DOCUMENT_CATEGORIES = [
  "contrato", "peticao", "procuracao", "comprovante", "certidao",
  "laudo", "parecer", "decisao", "despacho", "notificacao", "outro",
] as const;
const DOCUMENT_STATUSES = ["pendente", "recebido", "aprovado", "rejeitado", "arquivado"] as const;
const DOCUMENT_ENTITY_TYPES = ["matter", "account", "opportunity", "lead"] as const;
const TIME_ENTRY_TYPES = ["horas", "fixo", "contingencia"] as const;
const INVOICE_STATUSES = ["rascunho", "emitida", "paga", "atrasada", "cancelada"] as const;
const FEE_AGREEMENT_TYPES = ["hora", "fixo", "percentual", "contingencia"] as const;
const CONTACT_ROLES = ["proprietario", "administrador", "gerente", "advogado", "contador", "parceiro", "outro"] as const;
const PROPERTY_TYPES = ["propriedade", "posse", "area_de_interesse"] as const;
const OPPOSING_PARTY_TYPES = ["pessoa_fisica", "pessoa_juridica", "orgao_publico"] as const;

function optionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v));
  return undefined;
}

function numOrUndef(value: unknown, field: string): number | undefined {
  const r = optionalNumber(value, field);
  return r.ok ? (typeof r.data === "number" ? r.data : undefined) : undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

function entityId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function parseDocumentCreate(body: Body, owner: string) {
  const name = requiredString(body, "name");
  if (!name.ok) return name;
  const category = enumValue(body.category, DOCUMENT_CATEGORIES, "category");
  if (!category.ok) return category;
  const status = enumValue(body.status, DOCUMENT_STATUSES, "status");
  if (!status.ok) return status;
  const entityType = enumValue(body.entityType, DOCUMENT_ENTITY_TYPES, "entityType");
  if (!entityType.ok) return entityType;
  const entityIdValue = requiredString(body, "entityId");
  if (!entityIdValue.ok) return entityIdValue;
  const dueDate = optionalDate(body.dueDate, "dueDate");
  if (!dueDate.ok) return dueDate;
  const fileSize = optionalNumber(body.fileSize, "fileSize");
  if (!fileSize.ok) return fileSize;
  const now = nowIso();
  return {
    ok: true,
    data: {
      id: entityId("DOC"),
      name: name.data,
      category: (category.data ?? "outro") as DocumentCategory,
      status: (status.data ?? "pendente") as DocumentStatus,
      entityType: (entityType.data ?? "matter") as DocumentEntityType,
      entityId: entityIdValue.data,
      matterId: optionalNullableString(body.matterId) ?? null,
      description: optionalString(body.description),
      fileName: optionalString(body.fileName),
      fileSize: fileSize.data ?? undefined,
      mimeType: optionalString(body.mimeType),
      version: 1,
      versions: [{
        version: 1,
        fileName: optionalString(body.fileName) ?? name.data,
        uploadedBy: owner,
        uploadedAt: now,
      }],
      tags: optionalStringArray(body.tags),
      owner,
      dueDate: dueDate.data ?? null,
      createdAt: now,
      updatedAt: now,
    },
  } satisfies ValidationResult<unknown>;
}

export function parseDocumentPatch(body: Body) {
  const category = enumValue(body.category, DOCUMENT_CATEGORIES, "category");
  if (!category.ok) return category;
  const status = enumValue(body.status, DOCUMENT_STATUSES, "status");
  if (!status.ok) return status;
  const entityType = enumValue(body.entityType, DOCUMENT_ENTITY_TYPES, "entityType");
  if (!entityType.ok) return entityType;
  const dueDate = optionalDate(body.dueDate, "dueDate");
  if (!dueDate.ok) return dueDate;
  return {
    ok: true,
    data: {
      ...(category.data ? { category: category.data as DocumentCategory } : {}),
      ...(status.data ? { status: status.data as DocumentStatus } : {}),
      ...(entityType.data ? { entityType: entityType.data as DocumentEntityType } : {}),
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.description !== undefined ? { description: optionalString(body.description) } : {}),
      ...(body.matterId !== undefined ? { matterId: optionalNullableString(body.matterId) } : {}),
      ...(body.dueDate !== undefined ? { dueDate: dueDate.data ?? null } : {}),
      ...(body.tags !== undefined ? { tags: optionalStringArray(body.tags) } : {}),
      updatedAt: nowIso(),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseDocumentChecklistCreate(body: Body) {
  const matterId = requiredString(body, "matterId");
  if (!matterId.ok) return matterId;
  const label = requiredString(body, "label");
  if (!label.ok) return label;
  const category = enumValue(body.category, DOCUMENT_CATEGORIES, "category");
  if (!category.ok) return category;
  return {
    ok: true,
    data: {
      id: entityId("DCL"),
      matterId: matterId.data,
      label: label.data,
      category: (category.data ?? "outro") as DocumentCategory,
      required: Boolean(body.required),
      status: "pendente" as DocumentStatus,
      documentId: null,
      notes: optionalString(body.notes),
      createdAt: nowIso(),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseDocumentChecklistPatch(body: Body) {
  const category = enumValue(body.category, DOCUMENT_CATEGORIES, "category");
  if (!category.ok) return category;
  const status = enumValue(body.status, DOCUMENT_STATUSES, "status");
  if (!status.ok) return status;
  return {
    ok: true,
    data: {
      ...(category.data ? { category: category.data as DocumentCategory } : {}),
      ...(status.data ? { status: status.data as DocumentStatus } : {}),
      ...(body.label !== undefined ? { label: String(body.label) } : {}),
      ...(body.required !== undefined ? { required: Boolean(body.required) } : {}),
      ...(body.documentId !== undefined ? { documentId: optionalNullableString(body.documentId) } : {}),
      ...(body.notes !== undefined ? { notes: optionalString(body.notes) } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseTimeEntryCreate(body: Body, owner: string) {
  const matterId = requiredString(body, "matterId");
  if (!matterId.ok) return matterId;
  const description = requiredString(body, "description");
  if (!description.ok) return description;
  const type = enumValue(body.type, TIME_ENTRY_TYPES, "type");
  if (!type.ok) return type;
  const hours = optionalNumber(body.hours, "hours");
  if (!hours.ok) return hours;
  const hourlyRate = optionalNumber(body.hourlyRate, "hourlyRate");
  if (!hourlyRate.ok) return hourlyRate;
  const date = optionalDate(body.date, "date");
  if (!date.ok) return date;
  const h = hours.data ?? 0;
  const rate = hourlyRate.data ?? 0;
  return {
    ok: true,
    data: {
      id: entityId("TE"),
      matterId: matterId.data,
      taskId: optionalNullableString(body.taskId) ?? null,
      description: description.data,
      hours: h,
      hourlyRate: rate,
      totalBrl: h * rate,
      type: (type.data ?? "horas") as TimeEntryType,
      date: date.data ?? nowIso().slice(0, 10),
      owner,
      billable: body.billable !== false,
      invoiced: false,
      createdAt: nowIso(),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseTimeEntryPatch(body: Body) {
  const type = enumValue(body.type, TIME_ENTRY_TYPES, "type");
  if (!type.ok) return type;
  const hours = optionalNumber(body.hours, "hours");
  if (!hours.ok) return hours;
  const hourlyRate = optionalNumber(body.hourlyRate, "hourlyRate");
  if (!hourlyRate.ok) return hourlyRate;
  const date = optionalDate(body.date, "date");
  if (!date.ok) return date;
  const h = hours.data;
  const rate = hourlyRate.data;
  const hNum = typeof h === "number" ? h : undefined;
  const rateNum = typeof rate === "number" ? rate : undefined;
  return {
    ok: true,
    data: {
      ...(type.data ? { type: type.data as TimeEntryType } : {}),
      ...(body.description !== undefined ? { description: String(body.description) } : {}),
      ...(hNum !== undefined ? { hours: hNum } : {}),
      ...(rateNum !== undefined ? { hourlyRate: rateNum } : {}),
      ...(hNum !== undefined && rateNum !== undefined ? { totalBrl: hNum * rateNum } : {}),
      ...(date.data !== undefined ? { date: date.data ?? "" } : {}),
      ...(body.billable !== undefined ? { billable: Boolean(body.billable) } : {}),
      ...(body.invoiced !== undefined ? { invoiced: Boolean(body.invoiced) } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseInvoiceCreate(body: Body) {
  const accountId = requiredString(body, "accountId");
  if (!accountId.ok) return accountId;
  const status = enumValue(body.status, INVOICE_STATUSES, "status");
  if (!status.ok) return status;
  const totalBrl = optionalNumber(body.totalBrl, "totalBrl");
  if (!totalBrl.ok) return totalBrl;
  const dueAt = optionalDate(body.dueAt, "dueAt");
  if (!dueAt.ok) return dueAt;
  return {
    ok: true,
    data: {
      id: entityId("INV"),
      accountId: accountId.data,
      matterId: optionalNullableString(body.matterId) ?? null,
      number: optionalString(body.number) ?? `FAT-${Date.now()}`,
      status: (status.data ?? "rascunho") as InvoiceStatus,
      totalBrl: totalBrl.data ?? 0,
      issuedAt: nowIso(),
      dueAt: dueAt.data ?? "",
      notes: optionalString(body.notes),
      timeEntryIds: optionalStringArray(body.timeEntryIds) ?? [],
      createdAt: nowIso(),
    },
  } satisfies ValidationResult<unknown>;
}

type InvoiceStatus = "rascunho" | "emitida" | "paga" | "atrasada" | "cancelada";

export function parseInvoicePatch(body: Body) {
  const status = enumValue(body.status, INVOICE_STATUSES, "status");
  if (!status.ok) return status;
  const totalBrl = optionalNumber(body.totalBrl, "totalBrl");
  if (!totalBrl.ok) return totalBrl;
  const dueAt = optionalDate(body.dueAt, "dueAt");
  if (!dueAt.ok) return dueAt;
  const paidAt = optionalDate(body.paidAt, "paidAt");
  if (!paidAt.ok) return paidAt;
  return {
    ok: true,
    data: {
      ...(status.data ? { status: status.data as InvoiceStatus } : {}),
      ...(totalBrl.data !== undefined ? { totalBrl: totalBrl.data } : {}),
      ...(dueAt.data !== undefined ? { dueAt: dueAt.data ?? "" } : {}),
      ...(paidAt.data !== undefined ? { paidAt: paidAt.data ?? null } : {}),
      ...(body.notes !== undefined ? { notes: optionalString(body.notes) } : {}),
      ...(body.number !== undefined ? { number: String(body.number) } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseFeeAgreementCreate(body: Body) {
  const accountId = requiredString(body, "accountId");
  if (!accountId.ok) return accountId;
  const type = enumValue(body.type, FEE_AGREEMENT_TYPES, "type");
  if (!type.ok) return type;
  const hourlyRate = optionalNumber(body.hourlyRate, "hourlyRate");
  if (!hourlyRate.ok) return hourlyRate;
  const fixedValue = optionalNumber(body.fixedValue, "fixedValue");
  if (!fixedValue.ok) return fixedValue;
  const percentage = optionalNumber(body.percentage, "percentage");
  if (!percentage.ok) return percentage;
  const successFeePercentage = optionalNumber(body.successFeePercentage, "successFeePercentage");
  if (!successFeePercentage.ok) return successFeePercentage;
  const capValue = optionalNumber(body.capValue, "capValue");
  if (!capValue.ok) return capValue;
  const expiresAt = optionalDate(body.expiresAt, "expiresAt");
  if (!expiresAt.ok) return expiresAt;
  return {
    ok: true,
    data: {
      id: entityId("FA"),
      accountId: accountId.data,
      matterId: optionalNullableString(body.matterId) ?? null,
      type: (type.data ?? "hora") as FeeAgreementType,
      hourlyRate: hourlyRate.data ?? undefined,
      fixedValue: fixedValue.data ?? undefined,
      percentage: percentage.data ?? undefined,
      successFeePercentage: successFeePercentage.data ?? undefined,
      capValue: capValue.data ?? undefined,
      description: optionalString(body.description) ?? "",
      signedAt: optionalString(body.signedAt) ?? nowIso(),
      expiresAt: expiresAt.data ?? null,
      active: true,
      createdAt: nowIso(),
    },
  } satisfies ValidationResult<unknown>;
}

type FeeAgreementType = "hora" | "fixo" | "percentual" | "contingencia";

export function parseContactCreate(body: Body, owner: string) {
  const name = requiredString(body, "name");
  if (!name.ok) return name;
  const role = enumValue(body.role, CONTACT_ROLES, "role");
  if (!role.ok) return role;
  return {
    ok: true,
    data: {
      id: entityId("CT"),
      name: name.data,
      email: optionalString(body.email),
      phone: optionalString(body.phone),
      whatsapp: optionalString(body.whatsapp),
      cpf: optionalString(body.cpf),
      role: (role.data ?? "outro") as ContactRole,
      department: optionalString(body.department),
      isPrimary: Boolean(body.isPrimary),
      accountIds: optionalStringArray(body.accountIds) ?? [],
      notes: optionalString(body.notes),
      owner,
      createdAt: nowIso(),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseContactPatch(body: Body) {
  const role = enumValue(body.role, CONTACT_ROLES, "role");
  if (!role.ok) return role;
  return {
    ok: true,
    data: {
      ...(role.data ? { role: role.data as ContactRole } : {}),
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.email !== undefined ? { email: optionalString(body.email) } : {}),
      ...(body.phone !== undefined ? { phone: optionalString(body.phone) } : {}),
      ...(body.whatsapp !== undefined ? { whatsapp: optionalString(body.whatsapp) } : {}),
      ...(body.cpf !== undefined ? { cpf: optionalString(body.cpf) } : {}),
      ...(body.department !== undefined ? { department: optionalString(body.department) } : {}),
      ...(body.isPrimary !== undefined ? { isPrimary: Boolean(body.isPrimary) } : {}),
      ...(body.accountIds !== undefined ? { accountIds: optionalStringArray(body.accountIds) ?? [] } : {}),
      ...(body.notes !== undefined ? { notes: optionalString(body.notes) } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

export function parsePropertyCreate(body: Body, owner: string) {
  const name = requiredString(body, "name");
  if (!name.ok) return name;
  const accountId = requiredString(body, "accountId");
  if (!accountId.ok) return accountId;
  const type = enumValue(body.type, PROPERTY_TYPES, "type");
  if (!type.ok) return type;
  const areaHa = optionalNumber(body.areaHa, "areaHa");
  if (!areaHa.ok) return areaHa;
  return {
    ok: true,
    data: {
      id: entityId("PR"),
      name: name.data,
      type: (type.data ?? "propriedade") as PropertyType,
      accountId: accountId.data,
      carNumber: optionalString(body.carNumber),
      matricula: optionalString(body.matricula),
      areaHa: areaHa.data ?? 0,
      declaredAreaHa: numOrUndef(body.declaredAreaHa, "declaredAreaHa"),
      carAreaHa: numOrUndef(body.carAreaHa, "carAreaHa"),
      matriculaAreaHa: numOrUndef(body.matriculaAreaHa, "matriculaAreaHa"),
      location: optionalString(body.location),
      municipality: optionalString(body.municipality),
      state: optionalString(body.state),
      GPS: optionalString(body.GPS),
      mainCrop: optionalString(body.mainCrop),
      encumbrances: optionalStringArray(body.encumbrances),
      restrictions: optionalStringArray(body.restrictions),
      notes: optionalString(body.notes),
      owner,
      createdAt: nowIso(),
    },
  } satisfies ValidationResult<unknown>;
}

export function parsePropertyPatch(body: Body) {
  const type = enumValue(body.type, PROPERTY_TYPES, "type");
  if (!type.ok) return type;
  const areaHa = optionalNumber(body.areaHa, "areaHa");
  if (!areaHa.ok) return areaHa;
  return {
    ok: true,
    data: {
      ...(type.data ? { type: type.data as PropertyType } : {}),
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(areaHa.data !== undefined ? { areaHa: areaHa.data } : {}),
      ...(body.carNumber !== undefined ? { carNumber: optionalString(body.carNumber) } : {}),
      ...(body.matricula !== undefined ? { matricula: optionalString(body.matricula) } : {}),
      ...(body.location !== undefined ? { location: optionalString(body.location) } : {}),
      ...(body.municipality !== undefined ? { municipality: optionalString(body.municipality) } : {}),
      ...(body.state !== undefined ? { state: optionalString(body.state) } : {}),
      ...(body.mainCrop !== undefined ? { mainCrop: optionalString(body.mainCrop) } : {}),
      ...(body.notes !== undefined ? { notes: optionalString(body.notes) } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseOpposingPartyCreate(body: Body) {
  const name = requiredString(body, "name");
  if (!name.ok) return name;
  const type = enumValue(body.type, OPPOSING_PARTY_TYPES, "type");
  if (!type.ok) return type;
  return {
    ok: true,
    data: {
      id: entityId("OPP"),
      name: name.data,
      cpf: optionalString(body.cpf),
      cnpj: optionalString(body.cnpj),
      type: (type.data ?? "pessoa_fisica") as OpposingPartyType,
      lawyer: optionalString(body.lawyer),
      lawyerOab: optionalString(body.lawyerOab),
      phone: optionalString(body.phone),
      email: optionalString(body.email),
      address: optionalString(body.address),
      notes: optionalString(body.notes),
      matters: optionalStringArray(body.matters) ?? [],
      createdAt: nowIso(),
    },
  } satisfies ValidationResult<unknown>;
}

type OpposingPartyType = "pessoa_fisica" | "pessoa_juridica" | "orgao_publico";

export function parseOpposingPartyPatch(body: Body) {
  const type = enumValue(body.type, OPPOSING_PARTY_TYPES, "type");
  if (!type.ok) return type;
  return {
    ok: true,
    data: {
      ...(type.data ? { type: type.data as OpposingPartyType } : {}),
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.lawyer !== undefined ? { lawyer: optionalString(body.lawyer) } : {}),
      ...(body.lawyerOab !== undefined ? { lawyerOab: optionalString(body.lawyerOab) } : {}),
      ...(body.phone !== undefined ? { phone: optionalString(body.phone) } : {}),
      ...(body.email !== undefined ? { email: optionalString(body.email) } : {}),
      ...(body.notes !== undefined ? { notes: optionalString(body.notes) } : {}),
    },
  } satisfies ValidationResult<unknown>;
}

const KNOWLEDGE_DOC_TYPES = ["guia", "checklist", "nota_tecnica", "modelo", "faq"] as const;
const KNOWLEDGE_DOC_STATUSES = ["publicado", "rascunho", "em_revisao"] as const;
const KNOWLEDGE_CATEGORY_IDS = KNOWLEDGE_CATEGORIES.map((c) => c.id) as readonly string[];

function validCategory(value: unknown): ValidationResult<string> {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return { ok: false, error: "categoryId é obrigatório" };
  if (!KNOWLEDGE_CATEGORY_IDS.includes(text)) {
    return { ok: false, error: "categoryId inválido" };
  }
  return { ok: true, data: text };
}

/** Limite defensivo do corpo extraído persistido (espelha MAX_EXTRACTED_CHARS). */
const KNOWLEDGE_BODY_MAX = 200_000;

/** Extrai e valida os campos de anexo/corpo do payload de documento KB. */
function knowledgeFileFields(body: Body): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (body.body !== undefined) {
    const text = body.body === null ? "" : String(body.body);
    out.body = text.slice(0, KNOWLEDGE_BODY_MAX) || undefined;
  }
  if (body.fileUrl !== undefined) out.fileUrl = optionalString(body.fileUrl);
  if (body.fileName !== undefined) out.fileName = optionalString(body.fileName);
  if (body.fileType !== undefined) out.fileType = optionalString(body.fileType);
  if (body.fileSize !== undefined) {
    const n = Number(body.fileSize);
    out.fileSize = Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  }
  return out;
}

export function parseKnowledgeDocCreate(body: Body) {
  const title = requiredString(body, "title");
  if (!title.ok) return title;
  const summary = requiredString(body, "summary");
  if (!summary.ok) return summary;
  const category = validCategory(body.categoryId);
  if (!category.ok) return category;
  const type = enumValue(body.type, KNOWLEDGE_DOC_TYPES, "type");
  if (!type.ok) return type;
  const status = enumValue(body.status, KNOWLEDGE_DOC_STATUSES, "status");
  if (!status.ok) return status;
  return {
    ok: true,
    data: {
      id: entityId("kb"),
      categoryId: category.data,
      title: title.data,
      summary: summary.data,
      tags: optionalStringArray(body.tags) ?? [],
      type: type.data ?? "guia",
      status: status.data ?? "rascunho",
      ...knowledgeFileFields(body),
      updatedAt: nowIso(),
    },
  } satisfies ValidationResult<unknown>;
}

export function parseKnowledgeDocUpdate(body: Body) {
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = requiredString(body, "title");
    if (!title.ok) return title;
    patch.title = title.data;
  }
  if (body.summary !== undefined) {
    const summary = requiredString(body, "summary");
    if (!summary.ok) return summary;
    patch.summary = summary.data;
  }
  if (body.categoryId !== undefined) {
    const category = validCategory(body.categoryId);
    if (!category.ok) return category;
    patch.categoryId = category.data;
  }
  if (body.type !== undefined) {
    const type = enumValue(body.type, KNOWLEDGE_DOC_TYPES, "type");
    if (!type.ok) return type;
    if (type.data) patch.type = type.data;
  }
  if (body.status !== undefined) {
    const status = enumValue(body.status, KNOWLEDGE_DOC_STATUSES, "status");
    if (!status.ok) return status;
    if (status.data) patch.status = status.data;
  }
  if (body.tags !== undefined) {
    patch.tags = optionalStringArray(body.tags) ?? [];
  }
  Object.assign(patch, knowledgeFileFields(body));
  patch.updatedAt = nowIso();
  return { ok: true, data: patch } satisfies ValidationResult<unknown>;
}
