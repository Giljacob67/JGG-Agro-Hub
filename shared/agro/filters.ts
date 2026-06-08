import { isOverdue, isWithinDays, isCriticalDeadline, isTaskOverdue } from "./date-utils.js";
import type {
  Account,
  Lead,
  Matter,
  Opportunity,
  Task,
} from "./types.js";
import type {
  AccountListParams,
  LeadListParams,
  MatterListParams,
  OpportunityListParams,
  TaskListParams,
} from "./list-types.js";

const ALL = "all";

function matchesSearch(q: string, parts: Array<string | undefined | null>) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return parts.some((p) => p?.toLowerCase().includes(needle));
}

function matchesExact(filter: string | undefined, value: string) {
  return !filter || filter === ALL || filter === value;
}

const VALUE_RANGES: Record<string, { min: number; max: number }> = {
  ate_100k: { min: 0, max: 100_000 },
  "100k_200k": { min: 100_000, max: 200_000 },
  acima_200k: { min: 200_000, max: Infinity },
};

export function filterLeads(leads: Lead[], params: LeadListParams): Lead[] {
  const q = params.search?.trim() ?? "";
  return leads.filter((l) => {
    const matchSearch = matchesSearch(q, [
      l.name,
      l.region,
      l.owner,
      l.crop,
      l.source,
    ]);
    return (
      matchSearch &&
      matchesExact(params.status, l.status) &&
      matchesExact(params.region, l.region) &&
      matchesExact(params.source, l.source) &&
      matchesExact(params.crop, l.crop) &&
      matchesExact(params.owner, l.owner)
    );
  });
}

export function filterAccounts(
  accounts: Account[],
  params: AccountListParams,
): Account[] {
  const q = params.search?.trim() ?? "";
  return accounts.filter((a) => {
    const matchSearch = matchesSearch(q, [a.name, a.region, a.owner]);
    return (
      matchSearch &&
      matchesExact(params.type, a.type) &&
      matchesExact(params.region, a.region) &&
      matchesExact(params.owner, a.owner)
    );
  });
}

export function filterOpportunities(
  opportunities: Opportunity[],
  params: OpportunityListParams,
): Opportunity[] {
  const q = params.search?.trim() ?? "";
  return opportunities.filter((o) => {
    const matchSearch = matchesSearch(q, [
      o.title,
      o.accountName,
      o.practice,
    ]);
    const range = params.valueRange
      ? VALUE_RANGES[params.valueRange]
      : undefined;
    const matchValue =
      !range || (o.valueBrl >= range.min && o.valueBrl < range.max);
    return (
      matchSearch &&
      matchValue &&
      matchesExact(params.stage, o.stage) &&
      matchesExact(params.practice, o.practice) &&
      matchesExact(params.owner, o.owner) &&
      matchesExact(params.priority, o.priority)
    );
  });
}

export function filterMatters(matters: Matter[], params: MatterListParams): Matter[] {
  const q = params.search?.trim() ?? "";
  return matters.filter((m) => {
    const matchSearch = matchesSearch(q, [
      m.title,
      m.accountName,
      m.practice,
    ]);
    const matchDeadline =
      !params.deadline ||
      params.deadline === ALL ||
      (params.deadline === "vencidas" &&
        isOverdue(m.deadline) &&
        m.status !== "concluida") ||
      (params.deadline === "proximas" &&
        m.status !== "concluida" &&
        !isOverdue(m.deadline) &&
        isWithinDays(m.deadline, 7)) ||
      (params.deadline === "criticas" &&
        isCriticalDeadline(m.deadline, m.risk, m.status));
    return (
      matchSearch &&
      matchDeadline &&
      matchesExact(params.status, m.status) &&
      matchesExact(params.risk, m.risk) &&
      matchesExact(params.practice, m.practice) &&
      matchesExact(params.owner, m.owner)
    );
  });
}

function uniqueField<T>(items: T[], pick: (item: T) => string | undefined) {
  const set = new Set<string>();
  for (const item of items) {
    const value = pick(item)?.trim();
    if (value) set.add(value);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function buildLeadFacets(leads: Lead[]) {
  return {
    regions: uniqueField(leads, (l) => l.region),
    sources: uniqueField(leads, (l) => l.source),
    crops: uniqueField(leads, (l) => l.crop),
    owners: uniqueField(leads, (l) => l.owner),
  };
}

export function buildAccountFacets(accounts: Account[]) {
  return {
    regions: uniqueField(accounts, (a) => a.region),
    owners: uniqueField(accounts, (a) => a.owner),
  };
}

export function buildOpportunityFacets(opportunities: Opportunity[]) {
  return {
    practices: uniqueField(opportunities, (o) => o.practice),
    owners: uniqueField(opportunities, (o) => o.owner),
  };
}

export function buildMatterFacets(matters: Matter[]) {
  return {
    practices: uniqueField(matters, (m) => m.practice),
    owners: uniqueField(matters, (m) => m.owner),
  };
}

export function buildTaskFacets(tasks: Task[]) {
  return {
    owners: uniqueField(tasks, (t) => t.owner),
  };
}

export function filterTasks(tasks: Task[], params: TaskListParams): Task[] {
  const q = params.search?.trim() ?? "";
  return tasks.filter((t) => {
    const matchSearch = matchesSearch(q, [t.title, t.owner]);
    const overdue = isTaskOverdue(t);
    const matchDue =
      !params.due ||
      params.due === ALL ||
      (params.due === "vencidas" && overdue) ||
      (params.due === "proximas" &&
        t.status !== "concluida" &&
        !overdue &&
        isWithinDays(t.dueDate, 7));
    return (
      matchSearch &&
      matchDue &&
      matchesExact(params.status, t.status) &&
      matchesExact(params.priority, t.priority) &&
      matchesExact(params.owner, t.owner) &&
      matchesExact(params.type, t.type)
    );
  });
}