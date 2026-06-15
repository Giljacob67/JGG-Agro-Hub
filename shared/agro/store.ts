import {
  SEED_ACCOUNTS,
  SEED_ACTIVITIES,
  SEED_DEADLINES,
  SEED_LEADS,
  SEED_MATTERS,
  SEED_OPPORTUNITIES,
  SEED_TASKS,
} from "./seed.js";
import type {
  Account,
  Activity,
  ActivityEntityType,
  Deadline,
  Lead,
  Matter,
  Opportunity,
  Task,
} from "./types.js";

/** Store em memória — substituível por PostgreSQL via repositório. */
const store = {
  leads: structuredClone(SEED_LEADS),
  accounts: structuredClone(SEED_ACCOUNTS),
  opportunities: structuredClone(SEED_OPPORTUNITIES),
  matters: structuredClone(SEED_MATTERS),
  tasks: structuredClone(SEED_TASKS),
  deadlines: structuredClone(SEED_DEADLINES),
  activities: structuredClone(SEED_ACTIVITIES),
};

export function listLeads(): Lead[] {
  return store.leads;
}

export function getLead(id: string): Lead | undefined {
  return store.leads.find((l) => l.id === id);
}

export function listAccounts(): Account[] {
  return store.accounts;
}

export function getAccount(id: string): Account | undefined {
  return store.accounts.find((a) => a.id === id);
}

export function listOpportunities(): Opportunity[] {
  return store.opportunities;
}

export function getOpportunity(id: string): Opportunity | undefined {
  return store.opportunities.find((o) => o.id === id);
}

export function listMatters(): Matter[] {
  return store.matters;
}

export function getMatter(id: string): Matter | undefined {
  return store.matters.find((m) => m.id === id);
}

export function listTasks(): Task[] {
  return store.tasks;
}

export function getTask(id: string): Task | undefined {
  return store.tasks.find((t) => t.id === id);
}

export function getRelatedTasks(entityId: string): Task[] {
  return store.tasks.filter((t) => t.relatedTo === entityId);
}

export function getAccountTimeline(accountId: string) {
  return {
    leads: store.leads.filter((l) => l.accountId === accountId),
    opportunities: store.opportunities.filter((o) => o.accountId === accountId),
    matters: store.matters.filter((m) => m.accountId === accountId),
    tasks: store.tasks.filter((t) => {
      const prefix = t.relatedTo.split("-")[0];
      const entity =
        prefix === "LD"
          ? store.leads.find((l) => l.id === t.relatedTo)
          : prefix === "OP"
            ? store.opportunities.find((o) => o.id === t.relatedTo)
            : prefix === "MT"
              ? store.matters.find((m) => m.id === t.relatedTo)
              : undefined;
      if (!entity) return false;
      if ("accountId" in entity && entity.accountId === accountId) return true;
      return false;
    }),
  };
}

export function addLead(lead: Lead) {
  store.leads.push(lead);
}

export function patchLead(id: string, patch: Partial<Lead>): Lead | undefined {
  const lead = getLead(id);
  if (!lead) return undefined;
  Object.assign(lead, patch);
  return lead;
}

export function patchTask(id: string, patch: Partial<Task>): Task | undefined {
  const task = getTask(id);
  if (!task) return undefined;
  Object.assign(task, patch);
  return task;
}

export function patchOpportunity(
  id: string,
  patch: Partial<Opportunity>,
): Opportunity | undefined {
  const opp = getOpportunity(id);
  if (!opp) return undefined;
  Object.assign(opp, patch);
  return opp;
}

export function patchMatter(
  id: string,
  patch: Partial<Pick<Matter, "status" | "risk" | "deadline" | "owner" | "description">> & {
    cnjNumber?: string | null;
    court?: string | null;
    phase?: Matter["phase"] | null;
    opposingParty?: string | null;
    claimValueBrl?: number | null;
    opportunityId?: string | null;
    nextSteps?: string | null;
  },
): Matter | undefined {
  const matter = getMatter(id);
  if (!matter) return undefined;
  Object.assign(matter, patch);
  return matter;
}

/* ---------------------------------------------------------------- Prazos */

export function listDeadlines(matterId?: string): Deadline[] {
  if (!matterId) return store.deadlines;
  return store.deadlines.filter((d) => d.matterId === matterId);
}

export function getDeadline(id: string): Deadline | undefined {
  return store.deadlines.find((d) => d.id === id);
}

export function addDeadline(deadline: Deadline) {
  store.deadlines.push(deadline);
}

export function patchDeadline(
  id: string,
  patch: Partial<Pick<Deadline, "status" | "dueDate" | "completedAt" | "owner">> & {
    notes?: string | null;
  },
): Deadline | undefined {
  const deadline = getDeadline(id);
  if (!deadline) return undefined;
  Object.assign(deadline, patch);
  return deadline;
}

export function nextDeadlineId(): string {
  return `DL-${String(store.deadlines.length + 501).padStart(3, "0")}`;
}

/* ------------------------------------------------------------ Interações */

export function listActivities(
  entityId?: string,
  entityType?: ActivityEntityType,
): Activity[] {
  let result = store.activities;
  if (entityId) result = result.filter((a) => a.entityId === entityId);
  if (entityType) result = result.filter((a) => a.entityType === entityType);
  return [...result].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function addActivity(activity: Activity) {
  store.activities.push(activity);
}

export function nextActivityId(): string {
  return `ACT-${String(store.activities.length + 601).padStart(3, "0")}`;
}

/* ------------------------------------------------ Conversão e vínculos */

export function listMattersByOpportunity(opportunityId: string): Matter[] {
  return store.matters.filter((m) => m.opportunityId === opportunityId);
}

export function nextOpportunityId(): string {
  return `OP-${String(store.opportunities.length + 201).padStart(3, "0")}`;
}

export function addOpportunity(opp: Opportunity) {
  store.opportunities.push(opp);
}

/** Apenas para testes — reinicia o store. */
export function resetStore() {
  store.leads = structuredClone(SEED_LEADS);
  store.accounts = structuredClone(SEED_ACCOUNTS);
  store.opportunities = structuredClone(SEED_OPPORTUNITIES);
  store.matters = structuredClone(SEED_MATTERS);
  store.tasks = structuredClone(SEED_TASKS);
  store.deadlines = structuredClone(SEED_DEADLINES);
  store.activities = structuredClone(SEED_ACTIVITIES);
}
