import type {
  ActivityEntityType,
  ActivityType,
  DeadlineStatus,
  DeadlineType,
  LeadPriority,
  LeadStatus,
  MatterPhase,
  MatterStatus,
  MatterUrgency,
  OpportunityPriority,
  OpportunityStage,
  RiskLevel,
  TaskPriority,
  TaskStatus,
} from "../../shared/agro/types.js";

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
    },
  } satisfies ValidationResult<unknown>;
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
