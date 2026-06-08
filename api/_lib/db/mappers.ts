import type {
  Account,
  Lead,
  Matter,
  Opportunity,
  Task,
} from "../../../shared/agro/types.js";

function toDateStr(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function mapLead(row: Record<string, unknown>): Lead {
  return {
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
}

export function mapAccount(row: Record<string, unknown>): Account {
  return {
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
}

export function mapOpportunity(row: Record<string, unknown>): Opportunity {
  return {
    id: String(row.id),
    title: String(row.title),
    accountName: String(row.account_name),
    accountId: row.account_id ? String(row.account_id) : undefined,
    stage: row.stage as Opportunity["stage"],
    valueBrl: Number(row.value_brl),
    owner: String(row.owner),
    expectedClose: toDateStr(row.expected_close),
    nextContact: row.next_contact ? toDateStr(row.next_contact) : null,
    priority: (row.priority as Opportunity["priority"]) ?? "normal",
    practice: String(row.practice ?? ""),
  };
}

export function mapMatter(row: Record<string, unknown>): Matter {
  return {
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