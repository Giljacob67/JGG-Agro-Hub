import * as memory from "../../shared/agro/store";
import type {
  Account,
  Lead,
  LeadStatus,
  Matter,
  Opportunity,
  Task,
  TaskStatus,
} from "../../shared/agro/types";

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
};
import { isDbEnabled } from "./db/client";
import * as db from "./db/repository";

export { isDbEnabled };

export async function listLeads(): Promise<Lead[]> {
  if (isDbEnabled()) return db.dbListLeads();
  return memory.listLeads();
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

export async function listAccounts(): Promise<Account[]> {
  if (isDbEnabled()) return db.dbListAccounts();
  return memory.listAccounts();
}

export async function getAccount(id: string): Promise<Account | undefined | null> {
  if (isDbEnabled()) return db.dbGetAccount(id);
  return memory.getAccount(id);
}

export async function getAccountTimeline(accountId: string) {
  if (isDbEnabled()) return db.dbGetAccountTimeline(accountId);
  return memory.getAccountTimeline(accountId);
}

export async function listOpportunities(): Promise<Opportunity[]> {
  if (isDbEnabled()) return db.dbListOpportunities();
  return memory.listOpportunities();
}

export async function getOpportunity(id: string): Promise<Opportunity | undefined | null> {
  if (isDbEnabled()) return db.dbGetOpportunity(id);
  return memory.getOpportunity(id);
}

export async function listMatters(): Promise<Matter[]> {
  if (isDbEnabled()) return db.dbListMatters();
  return memory.listMatters();
}

export async function getMatter(id: string): Promise<Matter | undefined | null> {
  if (isDbEnabled()) return db.dbGetMatter(id);
  return memory.getMatter(id);
}

export async function listTasks(): Promise<Task[]> {
  if (isDbEnabled()) return db.dbListTasks();
  return memory.listTasks();
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