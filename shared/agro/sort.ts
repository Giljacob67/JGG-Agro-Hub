import type { ListParamsBase, SortDir } from "./list-types.js";
import type { Account, Lead, Matter, Opportunity, Task } from "./types.js";

/** Valor comparável extraído de um item para ordenação. */
type SortValue = string | number | null | undefined;
type Accessor<T> = (item: T) => SortValue;
type AccessorMap<T> = Record<string, Accessor<T>>;

const lower = (v: string | null | undefined): SortValue =>
  v == null ? null : v.toLocaleLowerCase("pt-BR");

// ── Mapas de acesso por entidade (chave = sortKey vindo do client) ──

export const LEAD_SORT: AccessorMap<Lead> = {
  name: (l) => lower(l.name),
  status: (l) => l.status,
  owner: (l) => lower(l.owner),
  region: (l) => lower(l.region),
  crop: (l) => lower(l.crop),
  source: (l) => lower(l.source),
  nextContact: (l) => l.nextContact ?? null,
  createdAt: (l) => l.createdAt,
};

export const ACCOUNT_SORT: AccessorMap<Account> = {
  name: (a) => lower(a.name),
  type: (a) => a.type,
  region: (a) => lower(a.region),
  owner: (a) => lower(a.owner),
  areaHa: (a) => a.areaHa ?? 0,
  since: (a) => a.since ?? null,
  activeMatters: (a) => a.activeMatters ?? 0,
  activeOpportunities: (a) => a.activeOpportunities ?? 0,
};

export const OPPORTUNITY_SORT: AccessorMap<Opportunity> = {
  title: (o) => lower(o.title),
  accountName: (o) => lower(o.accountName),
  stage: (o) => o.stage,
  valueBrl: (o) => o.valueBrl ?? 0,
  owner: (o) => lower(o.owner),
  expectedClose: (o) => o.expectedClose,
  priority: (o) => o.priority,
  practice: (o) => lower(o.practice),
};

export const MATTER_SORT: AccessorMap<Matter> = {
  title: (m) => lower(m.title),
  accountName: (m) => lower(m.accountName),
  practice: (m) => lower(m.practice),
  status: (m) => m.status,
  risk: (m) => m.risk,
  deadline: (m) => m.deadline,
  owner: (m) => lower(m.owner),
};

export const TASK_SORT: AccessorMap<Task> = {
  title: (t) => lower(t.title),
  type: (t) => t.type,
  priority: (t) => t.priority,
  status: (t) => t.status,
  dueDate: (t) => t.dueDate,
  owner: (t) => lower(t.owner),
};

/**
 * Ordena items em memória de forma estável.
 * Nulls sempre por último (independente de dir).
 * Sem `sort` válido no whitelist → retorna a lista original (preserva ordem do backend).
 */
export function sortItems<T>(
  items: T[],
  params: ListParamsBase,
  accessors: AccessorMap<T>,
): T[] {
  const key = params.sort;
  if (!key || !accessors[key]) return items;
  const accessor = accessors[key];
  const sign = params.dir === "desc" ? -1 : 1;

  return items
    .map((item, index) => ({ item, index, value: accessor(item) }))
    .sort((a, b) => {
      const av = a.value;
      const bv = b.value;
      const aNull = av == null || av === "";
      const bNull = bv == null || bv === "";
      if (aNull && bNull) return a.index - b.index;
      if (aNull) return 1; // null por último
      if (bNull) return -1;
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), "pt-BR", {
          numeric: true,
          sensitivity: "base",
        });
      }
      if (cmp !== 0) return cmp * sign;
      return a.index - b.index; // estável
    })
    .map((entry) => entry.item);
}

// ── ORDER BY seguro para SQL (whitelist de colunas) ─────────────────

/** Mapa sortKey → coluna SQL (já qualificada). Whitelist contra injeção. */
export type DbColumnMap = Record<string, string>;

export const LEAD_DB_SORT: DbColumnMap = {
  name: "name",
  status: "status",
  owner: "owner",
  region: "region",
  crop: "crop",
  source: "source",
  nextContact: "next_contact",
  createdAt: "created_at",
};

export const ACCOUNT_DB_SORT: DbColumnMap = {
  name: "a.name",
  type: "a.type",
  region: "a.region",
  owner: "a.owner",
  areaHa: "a.area_ha",
  since: "a.since",
  activeMatters: "active_matters",
  activeOpportunities: "active_opportunities",
};

export const OPPORTUNITY_DB_SORT: DbColumnMap = {
  title: "title",
  accountName: "account_name",
  stage: "stage",
  valueBrl: "value_brl",
  owner: "owner",
  expectedClose: "expected_close",
  priority: "priority",
  practice: "practice",
};

export const MATTER_DB_SORT: DbColumnMap = {
  title: "title",
  accountName: "account_name",
  practice: "practice",
  status: "status",
  risk: "risk",
  deadline: "deadline",
  owner: "owner",
};

export const TASK_DB_SORT: DbColumnMap = {
  title: "title",
  type: "type",
  priority: "priority",
  status: "status",
  dueDate: "due_date",
  owner: "owner",
};

/**
 * Constrói cláusula ORDER BY a partir de whitelist.
 * `fallback` já vem com o ORDER BY default (ex: "created_at DESC").
 * Sempre adiciona NULLS LAST para a coluna selecionada.
 */
export function orderByClause(
  params: ListParamsBase,
  columns: DbColumnMap,
  fallback: string,
): string {
  const key = params.sort;
  if (!key || !columns[key]) return `ORDER BY ${fallback}`;
  const dir: SortDir = params.dir === "desc" ? "desc" : "asc";
  const sqlDir = dir === "desc" ? "DESC" : "ASC";
  return `ORDER BY ${columns[key]} ${sqlDir} NULLS LAST`;
}
