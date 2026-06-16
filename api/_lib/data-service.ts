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
  Deadline,
  Lead,
  LeadPriority,
  LeadStatus,
  Matter,
  Opportunity,
  Task,
  TaskStatus,
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
import type { MatterPatch } from "./db/repository.js";

export { isDbEnabled };
export type { ConvertLeadInput, ConvertLeadResult, MatterPatch };

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
  if (!isDbEnabled()) return;
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
  const existing = memory.getAccount(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id };
  memory.patchAccount(id, patch as Partial<Account>);
  return memory.getAccount(id) ?? updated;
}

export async function deleteAccount(id: string): Promise<boolean> {
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
  const existing = memory.getTask(id);
  if (!existing) return undefined;
  memory.patchTask(id, patch as Partial<Task>);
  return memory.getTask(id) ?? { ...existing, ...patch, id };
}

export async function deleteTask(id: string): Promise<boolean> {
  memory.patchTask(id, { deletedAt: new Date().toISOString() } as Partial<Task>);
  return true;
}
