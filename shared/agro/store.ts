import {
  SEED_ACCOUNTS,
  SEED_LEADS,
  SEED_MATTERS,
  SEED_OPPORTUNITIES,
  SEED_TASKS,
} from "./seed";
import type { Account, Lead, Matter, Opportunity, Task } from "./types";

/** Store em memória — substituível por PostgreSQL via repositório. */
const store = {
  leads: structuredClone(SEED_LEADS),
  accounts: structuredClone(SEED_ACCOUNTS),
  opportunities: structuredClone(SEED_OPPORTUNITIES),
  matters: structuredClone(SEED_MATTERS),
  tasks: structuredClone(SEED_TASKS),
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

/** Apenas para testes — reinicia o store. */
export function resetStore() {
  store.leads = structuredClone(SEED_LEADS);
  store.accounts = structuredClone(SEED_ACCOUNTS);
  store.opportunities = structuredClone(SEED_OPPORTUNITIES);
  store.matters = structuredClone(SEED_MATTERS);
  store.tasks = structuredClone(SEED_TASKS);
}