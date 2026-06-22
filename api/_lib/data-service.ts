import * as memory from "../../shared/agro/store.js";
import {
  buildAccountFacets,
  buildLeadFacets,
  buildMatterFacets,
  buildOpportunityFacets,
  buildTaskFacets,
  filterAccounts,
  filterLeads,
  filterMatters,
  filterOpportunities,
  filterTasks,
} from "../../shared/agro/filters.js";
import type {
  AccountListParams,
  LeadListParams,
  MatterListParams,
  OpportunityListParams,
  PaginatedResult,
  TaskListParams,
} from "../../shared/agro/list-types.js";
import { paginate, type PaginationParams } from "../../shared/agro/list-types.js";
import type {
  Account,
  Activity,
  AgroUser,
  Contact,
  CreditInstrument,
  CropSeason,
  Deadline,
  Document,
  DocumentChecklistItem,
  EnvironmentalLicense,
  FeeAgreement,
  Invoice,
  Lead,
  LeadPriority,
  LeadStatus,
  Matter,
  Opportunity,
  OpposingParty,
  Property,
  Task,
  TaskStatus,
  TaxObligation,
  TimeEntry,
} from "../../shared/agro/types.js";
import {
  buildOpportunityFromLead,
  conversionActivitySummary,
  conversionBlockReason,
  todayIso,
  type ConvertLeadInput,
  type ConvertLeadResult,
} from "../../shared/agro/convert.js";
import { isDbEnabled } from "./db/client.js";
import * as db from "./db/repository.js";
import type { AccountPatch, MatterPatch, TaskPatch } from "./db/repository.js";
import { assertWritableInProd, WritableGuardError } from "./guard.js";
import { computeCrmStats } from "../../shared/agro/stats.js";
import type { CrmStats } from "../../shared/agro/types.js";

export { isDbEnabled };
export type { ConvertLeadInput, ConvertLeadResult, MatterPatch, AccountPatch, TaskPatch };

/** Bloqueia escritas memory-only em produção sem banco (perda silenciosa). */
function requireWritableOrThrow(resource: string): void {
  const g = assertWritableInProd(resource);
  if (!g.ok) throw new WritableGuardError(g.message, g.status);
}

/** Mapeia patch livre → AccountPatch (descarta chaves sem coluna no DB). */
function pickAccountPatch(patch: Record<string, unknown>): AccountPatch {
  const result: AccountPatch = {};
  if (patch.name !== undefined) result.name = String(patch.name);
  if (patch.type !== undefined) result.type = patch.type as Account["type"];
  if (patch.region !== undefined) result.region = String(patch.region);
  if (patch.areaHa !== undefined) result.areaHa = Number(patch.areaHa);
  if (patch.mainCrop !== undefined) result.mainCrop = String(patch.mainCrop);
  if (patch.owner !== undefined) result.owner = String(patch.owner);
  if (patch.relationshipStatus !== undefined) {
    result.relationshipStatus = patch.relationshipStatus as Account["relationshipStatus"];
  }
  return result;
}

/** Mapeia patch livre → TaskPatch (descarta chaves sem coluna no DB). */
function pickTaskPatch(patch: Record<string, unknown>): TaskPatch {
  const result: TaskPatch = {};
  if (patch.status !== undefined) result.status = patch.status as Task["status"];
  if (patch.priority !== undefined) result.priority = patch.priority as Task["priority"];
  if (patch.title !== undefined) result.title = String(patch.title);
  if (patch.owner !== undefined) result.owner = String(patch.owner);
  if (patch.dueDate !== undefined) result.dueDate = String(patch.dueDate);
  return result;
}

export type CreateLeadInput = {
  name: string;
  contact: string;
  region: string;
  crop: string;
  source: string;
  status?: LeadStatus;
  owner: string;
  notes?: string;
  nextContact?: string | null;
  accountId?: string | null;
  leadType?: string;
  legalPain?: string;
  interestArea?: string;
  priority?: LeadPriority;
};

function withFacets<T, P extends PaginationParams & { facets?: boolean }>(
  all: T[],
  params: P,
  filterFn: (items: T[], params: P) => T[],
  facetFn: (items: T[]) => Record<string, string[]>,
): PaginatedResult<T> {
  const filtered = filterFn(all, params);
  const result = paginate(filtered, params);
  if (params.facets) result.facets = facetFn(all);
  return result;
}

export async function listLeads(
  params: LeadListParams = {},
): Promise<PaginatedResult<Lead>> {
  if (isDbEnabled()) return db.dbListLeads(params);
  return withFacets(memory.listLeads(), params, filterLeads, buildLeadFacets);
}

export async function getLead(id: string): Promise<Lead | undefined | null> {
  if (isDbEnabled()) return db.dbGetLead(id);
  return memory.getLead(id);
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    name: input.name,
    contact: input.contact,
    region: input.region,
    crop: input.crop,
    source: input.source,
    status: input.status ?? "novo",
    owner: input.owner,
    notes: input.notes ?? "",
    nextContact: input.nextContact ?? null,
    accountId: input.accountId ?? null,
    leadType: input.leadType,
    legalPain: input.legalPain,
    interestArea: input.interestArea,
    priority: input.priority,
    createdAt: today,
  };
  if (isDbEnabled()) return db.dbCreateLead(payload);
  const id = `LD-${String(memory.listLeads().length + 1).padStart(3, "0")}`;
  const lead: Lead = { id, ...payload };
  memory.addLead(lead);
  return lead;
}

export async function updateLead(
  id: string,
  patch: Partial<Pick<Lead, "status" | "owner" | "nextContact" | "notes" | "name">>,
): Promise<Lead | null | undefined> {
  if (isDbEnabled()) return db.dbUpdateLead(id, patch);
  return memory.patchLead(id, patch) ?? undefined;
}

export async function deleteLead(id: string): Promise<boolean> {
  if (isDbEnabled()) return db.dbDeleteLead(id);
  requireWritableOrThrow("leads");
  memory.patchLead(id, { deletedAt: new Date().toISOString() } as Partial<Lead>);
  return true;
}

export async function listAccounts(
  params: AccountListParams = {},
): Promise<PaginatedResult<Account>> {
  if (isDbEnabled()) return db.dbListAccounts(params);
  return withFacets(
    memory.listAccounts(),
    params,
    filterAccounts,
    buildAccountFacets,
  );
}

export async function getAccount(id: string): Promise<Account | undefined | null> {
  if (isDbEnabled()) return db.dbGetAccount(id);
  return memory.getAccount(id);
}

export async function getAccountTimeline(accountId: string) {
  if (isDbEnabled()) return db.dbGetAccountTimeline(accountId);
  return memory.getAccountTimeline(accountId);
}

export async function listOpportunities(
  params: OpportunityListParams = {},
): Promise<PaginatedResult<Opportunity>> {
  if (isDbEnabled()) return db.dbListOpportunities(params);
  return withFacets(
    memory.listOpportunities(),
    params,
    filterOpportunities,
    buildOpportunityFacets,
  );
}

export async function getOpportunity(id: string): Promise<Opportunity | undefined | null> {
  if (isDbEnabled()) return db.dbGetOpportunity(id);
  return memory.getOpportunity(id);
}

export async function updateOpportunity(
  id: string,
  patch: Partial<Pick<Opportunity, "stage" | "priority" | "nextContact">>,
): Promise<Opportunity | null | undefined> {
  if (isDbEnabled()) return db.dbUpdateOpportunity(id, patch);
  return memory.patchOpportunity(id, patch) ?? undefined;
}

export async function listMatters(
  params: MatterListParams = {},
): Promise<PaginatedResult<Matter>> {
  if (isDbEnabled()) return db.dbListMatters(params);
  return withFacets(memory.listMatters(), params, filterMatters, buildMatterFacets);
}

export async function getMatter(id: string): Promise<Matter | undefined | null> {
  if (isDbEnabled()) return db.dbGetMatter(id);
  return memory.getMatter(id);
}

export async function updateMatter(
  id: string,
  patch: MatterPatch,
): Promise<Matter | null | undefined> {
  if (isDbEnabled()) return db.dbUpdateMatter(id, patch);
  const convertedPatch: Record<string, unknown> = { ...patch };
  return memory.patchMatter(id, convertedPatch as Partial<Matter>) ?? undefined;
}

export async function getMattersByOpportunity(
  opportunityId: string,
): Promise<Matter[]> {
  if (isDbEnabled()) return db.dbGetMattersByOpportunity(opportunityId);
  return memory.listMattersByOpportunity(opportunityId);
}

export async function listTasks(
  params: TaskListParams = {},
): Promise<PaginatedResult<Task>> {
  if (isDbEnabled()) return db.dbListTasks(params);
  return withFacets(memory.listTasks(), params, filterTasks, buildTaskFacets);
}

export async function getTask(id: string): Promise<Task | undefined | null> {
  if (isDbEnabled()) return db.dbGetTask(id);
  return memory.getTask(id);
}

export async function getRelatedTasks(entityId: string): Promise<Task[]> {
  if (isDbEnabled()) return db.dbGetRelatedTasks(entityId);
  return memory.getRelatedTasks(entityId);
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Task | null | undefined> {
  if (isDbEnabled()) return db.dbUpdateTaskStatus(id, status);
  return memory.patchTask(id, { status }) ?? undefined;
}

/* ---------------------------------------------------------------- Prazos */

export type CreateDeadlineInput = {
  matterId: string;
  title: string;
  type: Deadline["type"];
  dueDate: string;
  owner: string;
  notes?: string;
};

export async function listDeadlines(matterId?: string): Promise<Deadline[]> {
  if (isDbEnabled()) return db.dbListDeadlines(matterId);
  return memory.listDeadlines(matterId);
}

export async function createDeadline(
  input: CreateDeadlineInput,
): Promise<Deadline> {
  const payload = {
    matterId: input.matterId,
    title: input.title,
    type: input.type,
    status: "pendente" as const,
    dueDate: input.dueDate,
    owner: input.owner,
    completedAt: null,
    ...(input.notes ? { notes: input.notes } : {}),
  };
  if (isDbEnabled()) return db.dbCreateDeadline(payload);
  const deadline: Deadline = { id: memory.nextDeadlineId(), ...payload };
  memory.addDeadline(deadline);
  return deadline;
}

export async function updateDeadline(
  id: string,
  patch: Partial<
    Pick<Deadline, "status" | "dueDate" | "completedAt" | "owner"> & {
      notes: string | null;
    }
  >,
): Promise<Deadline | null | undefined> {
  if (isDbEnabled()) return db.dbUpdateDeadline(id, patch);
  return memory.patchDeadline(id, patch) ?? undefined;
}

/* ------------------------------------------------------------ Interações */

export type CreateActivityInput = {
  entityType: Activity["entityType"];
  entityId: string;
  type: Activity["type"];
  summary: string;
  date?: string;
  owner: string;
};

export async function listActivities(
  entityId?: string,
  entityType?: Activity["entityType"],
): Promise<Activity[]> {
  if (isDbEnabled()) return db.dbListActivities(entityId, entityType);
  return memory.listActivities(entityId, entityType);
}

export async function createActivity(
  input: CreateActivityInput,
): Promise<Activity> {
  const payload = {
    entityType: input.entityType,
    entityId: input.entityId,
    type: input.type,
    summary: input.summary,
    date: input.date ?? todayIso(),
    owner: input.owner,
  };
  if (isDbEnabled()) return db.dbCreateActivity(payload);
  const activity: Activity = {
    id: memory.nextActivityId(),
    ...payload,
    createdAt: new Date().toISOString(),
  };
  memory.addActivity(activity);
  return activity;
}

/* -------------------------------------------------- Conversão de lead */

export async function convertLead(
  leadId: string,
  input: ConvertLeadInput = {},
): Promise<ConvertLeadResult> {
  const lead = await getLead(leadId);
  const blocked = conversionBlockReason(lead);
  if (blocked) return { ok: false, reason: blocked };

  const safeLead = lead as Lead;
  const oppId = isDbEnabled()
    ? await db.dbNextOpportunityId()
    : memory.nextOpportunityId();
  const opportunity = buildOpportunityFromLead(safeLead, oppId, input);

  let created: Opportunity;
  if (isDbEnabled()) {
    created = await db.dbConvertLead(safeLead, opportunity);
  } else {
    requireWritableOrThrow("opportunities");
    memory.addOpportunity(opportunity);
    memory.patchLead(safeLead.id, {
      status: "qualificado",
      convertedOpportunityId: opportunity.id,
    });
    created = opportunity;
  }

  const summary = conversionActivitySummary(created.id);
  await createActivity({
    entityType: "lead",
    entityId: safeLead.id,
    type: "sistema",
    summary,
    owner: created.owner,
  });
  await createActivity({
    entityType: "opportunity",
    entityId: created.id,
    type: "sistema",
    summary: `Oportunidade criada a partir do lead ${safeLead.id} (${safeLead.name}).`,
    owner: created.owner,
  });

  const updatedLead = await getLead(safeLead.id);
  return { ok: true, lead: updatedLead as Lead, opportunity: created };
}

export async function loadCrmDataset() {
  if (isDbEnabled()) return db.dbLoadAll();
  return {
    leads: memory.listLeads(),
    accounts: memory.listAccounts(),
    opportunities: memory.listOpportunities(),
    matters: memory.listMatters(),
    tasks: memory.listTasks(),
  };
}

/**
 * Stats do CRM. Em DB usa agregação SQL nativa (dbGetCrmStats) — sem SELECT *
 * em 7 tabelas + computeCrmStats em JS. Em memória, usa computeCrmStats.
 * Try/catch: se a agregação SQL falhar (ex: coluna/migration pendente),
 * cai no caminho legacy (loadCrmDataset + computeCrmStats) para não quebrar
 * a UI de stats.
 */
export async function getCrmStats(): Promise<CrmStats> {
  if (isDbEnabled()) {
    try {
      return await db.dbGetCrmStats();
    } catch (err) {
      console.warn("[stats] dbGetCrmStats falhou, fallback para loadCrmDataset:", err);
    }
  }
  const dataset = await loadCrmDataset();
  return computeCrmStats({
    leads: dataset.leads,
    accounts: dataset.accounts,
    opportunities: dataset.opportunities,
    matters: dataset.matters,
    tasks: dataset.tasks,
  });
}

export async function setupDatabase(options?: { force?: boolean }) {
  const { runMigrations } = await import("./db/migrate.js");
  const {
    SEED_ACCOUNTS,
    SEED_ACTIVITIES,
    SEED_DEADLINES,
    SEED_LEADS,
    SEED_MATTERS,
    SEED_OPPORTUNITIES,
    SEED_TASKS,
    SEED_CROP_SEASONS,
    SEED_TAX_OBLIGATIONS,
    SEED_ENVIRONMENTAL_LICENSES,
    SEED_CREDIT_INSTRUMENTS,
  } = await import("../../shared/agro/seed.js");

  await runMigrations();

  const force = options?.force === true;
  if (!force) {
    const empty = await db.dbSeedEmpty();
    if (!empty) {
      const leads = await listLeads();
      return { leadsCount: leads.total, reseeded: false };
    }
  }

  await db.dbUpsertSeed({
    accounts: SEED_ACCOUNTS,
    leads: SEED_LEADS,
    opportunities: SEED_OPPORTUNITIES,
    matters: SEED_MATTERS,
    tasks: SEED_TASKS,
    deadlines: SEED_DEADLINES,
    activities: SEED_ACTIVITIES,
  });

  await db.dbUpsertSecondarySeed({
    cropSeasons: SEED_CROP_SEASONS,
    taxObligations: SEED_TAX_OBLIGATIONS,
    environmentalLicenses: SEED_ENVIRONMENTAL_LICENSES,
    creditInstruments: SEED_CREDIT_INSTRUMENTS,
  });

  const leads = await listLeads();
  return { leadsCount: leads.total, reseeded: true };
}

export async function recordAudit(input: {
  actor: AgroUser;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!isDbEnabled()) {
    requireWritableOrThrow("audit");
    return;
  }
  await db.dbCreateAuditLog(input);
}

export async function createAccount(input: {
  name: string;
  type?: string;
  region?: string;
  areaHa?: number;
  mainCrop?: string;
  owner: string;
  cnpj?: string;
  cpf?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  if (isDbEnabled()) {
    return db.dbCreateAccount({
      name: input.name,
      type: input.type as Account["type"] | undefined,
      region: input.region,
      areaHa: input.areaHa,
      mainCrop: input.mainCrop,
      owner: input.owner,
    });
  }
  requireWritableOrThrow("accounts");
  const today = new Date().toISOString().slice(0, 10);
  const id = `AC-${String(memory.listAccounts().length + 1).padStart(3, "0")}`;
  const account: Account = {
    id,
    name: input.name,
    type: (input.type as Account["type"]) ?? "produtor",
    region: input.region ?? "",
    areaHa: input.areaHa ?? 0,
    mainCrop: input.mainCrop ?? "",
    owner: input.owner,
    activeMatters: 0,
    activeOpportunities: 0,
    since: today,
  };
  memory.addAccount(account);
  return account;
}

export async function updateAccount(
  id: string,
  patch: Record<string, unknown>,
): Promise<Account | undefined> {
  if (isDbEnabled()) {
    const updated = await db.dbUpdateAccount(id, pickAccountPatch(patch));
    return updated ?? undefined;
  }
  requireWritableOrThrow("accounts");
  const existing = memory.getAccount(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id };
  memory.patchAccount(id, patch as Partial<Account>);
  return memory.getAccount(id) ?? updated;
}

export async function deleteAccount(id: string): Promise<boolean> {
  if (isDbEnabled()) return db.dbDeleteAccount(id);
  requireWritableOrThrow("accounts");
  memory.patchAccount(id, { deletedAt: new Date().toISOString() } as Partial<Account>);
  return true;
}

export async function createOpportunity(input: {
  title: string;
  accountName?: string;
  accountId?: string;
  stage?: string;
  valueBrl?: number;
  owner: string;
  expectedClose?: string;
  priority?: string;
  practice?: string;
  description?: string;
}) {
  if (isDbEnabled()) {
    return db.dbCreateOpportunity({
      title: input.title,
      accountName: input.accountName,
      accountId: input.accountId,
      stage: input.stage as Opportunity["stage"] | undefined,
      valueBrl: input.valueBrl,
      owner: input.owner,
      expectedClose: input.expectedClose,
      priority: input.priority as Opportunity["priority"] | undefined,
      practice: input.practice,
    });
  }
  requireWritableOrThrow("opportunities");
  const id = `OP-${String(memory.listOpportunities().length + 1).padStart(3, "0")}`;
  const opp: Opportunity = {
    id,
    title: input.title,
    accountName: input.accountName ?? "",
    accountId: input.accountId,
    stage: (input.stage as Opportunity["stage"]) ?? "novo_contato",
    valueBrl: input.valueBrl ?? 0,
    owner: input.owner,
    expectedClose: input.expectedClose ?? "",
    nextContact: null,
    priority: (input.priority as Opportunity["priority"]) ?? "normal",
    practice: input.practice ?? "",
  };
  memory.addOpportunity(opp);
  return opp;
}

export async function deleteOpportunity(id: string): Promise<boolean> {
  if (isDbEnabled()) return db.dbDeleteOpportunity(id);
  requireWritableOrThrow("opportunities");
  memory.patchOpportunity(id, { deletedAt: new Date().toISOString() } as Partial<Opportunity>);
  return true;
}

export async function createMatter(input: {
  title: string;
  accountName?: string;
  accountId?: string;
  practice?: string;
  status?: string;
  risk?: string;
  deadline?: string;
  owner: string;
  description?: string;
  urgency?: string;
  cnjNumber?: string;
  court?: string;
  opposingParty?: string;
  clientLawyer?: string;
  opposingLawyer?: string;
  nextHearingDate?: string | null;
  jurisdiction?: string;
}) {
  if (isDbEnabled()) {
    return db.dbCreateMatter({
      title: input.title,
      accountName: input.accountName,
      accountId: input.accountId,
      practice: input.practice,
      status: input.status as Matter["status"] | undefined,
      risk: input.risk as Matter["risk"] | undefined,
      deadline: input.deadline,
      owner: input.owner,
      description: input.description,
      urgency: input.urgency as Matter["urgency"] | undefined,
      cnjNumber: input.cnjNumber,
      court: input.court,
      opposingParty: input.opposingParty,
    });
  }
  requireWritableOrThrow("matters");
  const id = `MT-${String(memory.listMatters().length + 1).padStart(3, "0")}`;
  const matter: Matter = {
    id,
    title: input.title,
    accountName: input.accountName ?? "",
    accountId: input.accountId,
    practice: input.practice ?? "",
    status: (input.status as Matter["status"]) ?? "aberta",
    risk: (input.risk as Matter["risk"]) ?? "baixo",
    deadline: input.deadline ?? "",
    owner: input.owner,
    description: input.description ?? "",
    urgency: (input.urgency as Matter["urgency"]) ?? "normal",
    cnjNumber: input.cnjNumber,
    court: input.court,
    opposingParty: input.opposingParty,
    clientLawyer: input.clientLawyer,
    opposingLawyer: input.opposingLawyer,
    nextHearingDate: input.nextHearingDate,
    jurisdiction: input.jurisdiction as Matter["jurisdiction"],
  };
  memory.addMatter(matter);
  return matter;
}

export async function deleteMatter(id: string): Promise<boolean> {
  if (isDbEnabled()) return db.dbDeleteMatter(id);
  requireWritableOrThrow("matters");
  memory.patchMatter(id, { deletedAt: new Date().toISOString() } as Partial<Matter>);
  return true;
}

export async function createTask(input: {
  title: string;
  relatedTo?: string;
  type?: string;
  priority?: string;
  dueDate?: string;
  owner: string;
  description?: string;
}) {
  if (isDbEnabled()) {
    return db.dbCreateTask({
      title: input.title,
      relatedTo: input.relatedTo,
      type: input.type as Task["type"] | undefined,
      priority: input.priority as Task["priority"] | undefined,
      dueDate: input.dueDate,
      owner: input.owner,
    });
  }
  requireWritableOrThrow("tasks");
  const id = `TK-${String(memory.listTasks().length + 1).padStart(3, "0")}`;
  const task: Task = {
    id,
    title: input.title,
    relatedTo: input.relatedTo ?? "",
    type: (input.type as Task["type"]) ?? "operacional",
    priority: (input.priority as Task["priority"]) ?? "media",
    status: "pendente",
    dueDate: input.dueDate ?? "",
    owner: input.owner,
  };
  memory.addTask(task);
  return task;
}

export async function updateTask(
  id: string,
  patch: Record<string, unknown>,
): Promise<Task | undefined> {
  if (isDbEnabled()) {
    const updated = await db.dbUpdateTask(id, pickTaskPatch(patch));
    return updated ?? undefined;
  }
  requireWritableOrThrow("tasks");
  const existing = memory.getTask(id);
  if (!existing) return undefined;
  memory.patchTask(id, patch as Partial<Task>);
  return memory.getTask(id) ?? { ...existing, ...patch, id };
}

export async function deleteTask(id: string): Promise<boolean> {
  if (isDbEnabled()) return db.dbDeleteTask(id);
  requireWritableOrThrow("tasks");
  memory.patchTask(id, { deletedAt: new Date().toISOString() } as Partial<Task>);
  return true;
}

// ── Documents ──────────────────────────────────────────────────────

export async function listDocuments(
  filters: { entityType?: string; entityId?: string; matterId?: string } = {},
): Promise<Document[]> {
  if (isDbEnabled()) return db.dbListDocuments(filters);
  return memory.listDocuments(filters);
}

export async function getDocument(id: string): Promise<Document | undefined | null> {
  if (isDbEnabled()) return db.dbGetDocument(id);
  return memory.getDocument(id);
}

export async function createDocument(doc: Document): Promise<Document> {
  if (isDbEnabled()) return db.dbCreateDocument(doc);
  requireWritableOrThrow("documents");
  return memory.addDocument(doc);
}

export async function updateDocument(
  id: string,
  patch: Partial<Document>,
): Promise<Document | undefined | null> {
  if (isDbEnabled()) return db.dbUpdateDocument(id, patch);
  requireWritableOrThrow("documents");
  return memory.patchDocument(id, patch);
}

export async function deleteDocument(id: string): Promise<boolean> {
  if (isDbEnabled()) return db.dbDeleteDocument(id);
  requireWritableOrThrow("documents");
  return memory.deleteDocument(id);
}

// ── Contacts ───────────────────────────────────────────────────────

export async function listContacts(
  filters: { accountId?: string } = {},
): Promise<Contact[]> {
  if (isDbEnabled()) return db.dbListContacts(filters);
  return memory.listContacts(filters);
}

export async function getContact(id: string): Promise<Contact | undefined | null> {
  if (isDbEnabled()) return db.dbGetContact(id);
  return memory.getContact(id);
}

export async function createContact(contact: Contact): Promise<Contact> {
  if (isDbEnabled()) return db.dbCreateContact(contact);
  requireWritableOrThrow("contacts");
  return memory.addContact(contact);
}

export async function updateContact(
  id: string,
  patch: Partial<Contact>,
): Promise<Contact | undefined | null> {
  if (isDbEnabled()) return db.dbUpdateContact(id, patch);
  requireWritableOrThrow("contacts");
  return memory.patchContact(id, patch);
}

export async function deleteContact(id: string): Promise<boolean> {
  if (isDbEnabled()) return db.dbDeleteContact(id);
  requireWritableOrThrow("contacts");
  return memory.deleteContact(id);
}

// ── Properties ─────────────────────────────────────────────────────

export async function listProperties(
  filters: { accountId?: string } = {},
): Promise<Property[]> {
  if (isDbEnabled()) return db.dbListProperties(filters);
  return memory.listProperties(filters);
}

export async function getProperty(id: string): Promise<Property | undefined | null> {
  if (isDbEnabled()) return db.dbGetProperty(id);
  return memory.getProperty(id);
}

export async function createProperty(property: Property): Promise<Property> {
  if (isDbEnabled()) return db.dbCreateProperty(property);
  requireWritableOrThrow("properties");
  return memory.addProperty(property);
}

export async function updateProperty(
  id: string,
  patch: Partial<Property>,
): Promise<Property | undefined | null> {
  if (isDbEnabled()) return db.dbUpdateProperty(id, patch);
  requireWritableOrThrow("properties");
  return memory.patchProperty(id, patch);
}

export async function deleteProperty(id: string): Promise<boolean> {
  if (isDbEnabled()) return db.dbDeleteProperty(id);
  requireWritableOrThrow("properties");
  return memory.deleteProperty(id);
}

// ── Invoices ───────────────────────────────────────────────────────

export async function listInvoices(
  filters: { accountId?: string; status?: string } = {},
): Promise<Invoice[]> {
  if (isDbEnabled()) return db.dbListInvoices(filters);
  return memory.listInvoices(filters);
}

export async function getInvoice(id: string): Promise<Invoice | undefined | null> {
  if (isDbEnabled()) return db.dbGetInvoice(id);
  return memory.getInvoice(id);
}

export async function createInvoice(invoice: Invoice): Promise<Invoice> {
  if (isDbEnabled()) return db.dbCreateInvoice(invoice);
  requireWritableOrThrow("invoices");
  return memory.addInvoice(invoice);
}

export async function updateInvoice(
  id: string,
  patch: Partial<Invoice>,
): Promise<Invoice | undefined | null> {
  if (isDbEnabled()) return db.dbUpdateInvoice(id, patch);
  requireWritableOrThrow("invoices");
  return memory.patchInvoice(id, patch);
}

// ── Document Checklist ─────────────────────────────────────────────

export async function listDocumentChecklist(
  matterId: string,
): Promise<DocumentChecklistItem[]> {
  if (isDbEnabled()) return db.dbListDocumentChecklist(matterId);
  return memory.listDocumentChecklist(matterId);
}

export async function createDocumentChecklistItem(
  item: DocumentChecklistItem,
): Promise<DocumentChecklistItem> {
  if (isDbEnabled()) return db.dbCreateDocumentChecklistItem(item);
  requireWritableOrThrow("document-checklist");
  return memory.addDocumentChecklistItem(item);
}

export async function updateDocumentChecklistItem(
  id: string,
  patch: Partial<DocumentChecklistItem>,
): Promise<DocumentChecklistItem | undefined | null> {
  if (isDbEnabled()) return db.dbUpdateDocumentChecklistItem(id, patch);
  requireWritableOrThrow("document-checklist");
  return memory.patchDocumentChecklistItem(id, patch);
}

export async function deleteDocumentChecklistItem(id: string): Promise<boolean> {
  if (isDbEnabled()) return db.dbDeleteDocumentChecklistItem(id);
  requireWritableOrThrow("document-checklist");
  return memory.deleteDocumentChecklistItem(id);
}

// ── Time Entries ───────────────────────────────────────────────────

export async function listTimeEntries(
  filters: { matterId?: string; owner?: string; invoiced?: boolean } = {},
): Promise<TimeEntry[]> {
  if (isDbEnabled()) return db.dbListTimeEntries(filters);
  return memory.listTimeEntries(filters);
}

export async function getTimeEntry(id: string): Promise<TimeEntry | undefined | null> {
  if (isDbEnabled()) return db.dbGetTimeEntry(id);
  return memory.listTimeEntries().find((t) => t.id === id);
}

export async function createTimeEntry(entry: TimeEntry): Promise<TimeEntry> {
  if (isDbEnabled()) return db.dbCreateTimeEntry(entry);
  requireWritableOrThrow("time-entries");
  return memory.addTimeEntry(entry);
}

export async function updateTimeEntry(
  id: string,
  patch: Partial<TimeEntry>,
): Promise<TimeEntry | undefined | null> {
  if (isDbEnabled()) return db.dbUpdateTimeEntry(id, patch);
  requireWritableOrThrow("time-entries");
  return memory.patchTimeEntry(id, patch);
}

export async function deleteTimeEntry(id: string): Promise<boolean> {
  if (isDbEnabled()) return db.dbDeleteTimeEntry(id);
  requireWritableOrThrow("time-entries");
  return memory.deleteTimeEntry(id);
}

// ── Fee Agreements ─────────────────────────────────────────────────

export async function listFeeAgreements(
  filters: { accountId?: string; matterId?: string } = {},
): Promise<FeeAgreement[]> {
  if (isDbEnabled()) return db.dbListFeeAgreements(filters);
  return memory.listFeeAgreements(filters);
}

export async function getFeeAgreement(id: string): Promise<FeeAgreement | undefined | null> {
  if (isDbEnabled()) return db.dbGetFeeAgreement(id);
  return memory.listFeeAgreements().find((f) => f.id === id);
}

export async function createFeeAgreement(fee: FeeAgreement): Promise<FeeAgreement> {
  if (isDbEnabled()) return db.dbCreateFeeAgreement(fee);
  requireWritableOrThrow("fee-agreements");
  return memory.addFeeAgreement(fee);
}

// ── Opposing Parties ───────────────────────────────────────────────

export async function listOpposingParties(): Promise<OpposingParty[]> {
  if (isDbEnabled()) return db.dbListOpposingParties();
  return memory.listOpposingParties();
}

export async function getOpposingParty(id: string): Promise<OpposingParty | undefined | null> {
  if (isDbEnabled()) return db.dbGetOpposingParty(id);
  return memory.listOpposingParties().find((p) => p.id === id);
}

export async function createOpposingParty(party: OpposingParty): Promise<OpposingParty> {
  if (isDbEnabled()) return db.dbCreateOpposingParty(party);
  requireWritableOrThrow("opposing-parties");
  return memory.addOpposingParty(party);
}

export async function updateOpposingParty(
  id: string,
  patch: Partial<OpposingParty>,
): Promise<OpposingParty | undefined | null> {
  if (isDbEnabled()) return db.dbUpdateOpposingParty(id, patch);
  requireWritableOrThrow("opposing-parties");
  return memory.patchOpposingParty(id, patch);
}

// ── Crop Seasons ───────────────────────────────────────────────────

export async function listCropSeasons(
  filters: { year?: number; region?: string } = {},
): Promise<CropSeason[]> {
  if (isDbEnabled()) return db.dbListCropSeasons(filters);
  return memory.listCropSeasons(filters);
}

export async function getCropSeason(id: string): Promise<CropSeason | undefined | null> {
  if (isDbEnabled()) return db.dbGetCropSeason(id);
  return memory.listCropSeasons().find((c) => c.id === id);
}

export async function createCropSeason(season: CropSeason): Promise<CropSeason> {
  if (isDbEnabled()) return db.dbCreateCropSeason(season);
  requireWritableOrThrow("crop-seasons");
  return memory.addCropSeason(season);
}

// ── Tax Obligations ────────────────────────────────────────────────

export async function listTaxObligations(
  filters: { propertyId?: string; accountId?: string; year?: number } = {},
): Promise<TaxObligation[]> {
  if (isDbEnabled()) return db.dbListTaxObligations(filters);
  return memory.listTaxObligations(filters);
}

export async function getTaxObligation(id: string): Promise<TaxObligation | undefined | null> {
  if (isDbEnabled()) return db.dbGetTaxObligation(id);
  return memory.listTaxObligations().find((t) => t.id === id);
}

export async function createTaxObligation(tax: TaxObligation): Promise<TaxObligation> {
  if (isDbEnabled()) return db.dbCreateTaxObligation(tax);
  requireWritableOrThrow("tax-obligations");
  return memory.addTaxObligation(tax);
}

// ── Environmental Licenses ─────────────────────────────────────────

export async function listEnvironmentalLicenses(
  filters: { propertyId?: string; accountId?: string } = {},
): Promise<EnvironmentalLicense[]> {
  if (isDbEnabled()) return db.dbListEnvironmentalLicenses(filters);
  return memory.listEnvironmentalLicenses(filters);
}

export async function getEnvironmentalLicense(
  id: string,
): Promise<EnvironmentalLicense | undefined | null> {
  if (isDbEnabled()) return db.dbGetEnvironmentalLicense(id);
  return memory.listEnvironmentalLicenses().find((l) => l.id === id);
}

export async function createEnvironmentalLicense(
  license: EnvironmentalLicense,
): Promise<EnvironmentalLicense> {
  if (isDbEnabled()) return db.dbCreateEnvironmentalLicense(license);
  requireWritableOrThrow("environmental-licenses");
  return memory.addEnvironmentalLicense(license);
}

// ── Credit Instruments ─────────────────────────────────────────────

export async function listCreditInstruments(
  filters: { accountId?: string; matterId?: string } = {},
): Promise<CreditInstrument[]> {
  if (isDbEnabled()) return db.dbListCreditInstruments(filters);
  return memory.listCreditInstruments(filters);
}

export async function getCreditInstrument(
  id: string,
): Promise<CreditInstrument | undefined | null> {
  if (isDbEnabled()) return db.dbGetCreditInstrument(id);
  return memory.listCreditInstruments().find((c) => c.id === id);
}

export async function createCreditInstrument(
  instrument: CreditInstrument,
): Promise<CreditInstrument> {
  if (isDbEnabled()) return db.dbCreateCreditInstrument(instrument);
  requireWritableOrThrow("credit-instruments");
  return memory.addCreditInstrument(instrument);
}
