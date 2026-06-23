import type {
  AccountListParams,
  LeadListParams,
  MatterListParams,
  OpportunityListParams,
  TaskListParams,
} from "./list-types.js";

function str(params: URLSearchParams, key: string) {
  return params.get(key) ?? undefined;
}

function num(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parseLeadParams(search: URLSearchParams): LeadListParams {
  return {
    page: num(search, "page"),
    pageSize: num(search, "pageSize"),
    facets: search.get("facets") === "1" || search.get("facets") === "true",
    search: str(search, "search"),
    status: str(search, "status"),
    region: str(search, "region"),
    source: str(search, "source"),
    crop: str(search, "crop"),
    owner: str(search, "owner"),
    listId: str(search, "listId"),
  };
}

export function parseAccountParams(search: URLSearchParams): AccountListParams {
  return {
    page: num(search, "page"),
    pageSize: num(search, "pageSize"),
    facets: search.get("facets") === "1" || search.get("facets") === "true",
    search: str(search, "search"),
    type: str(search, "type"),
    region: str(search, "region"),
    owner: str(search, "owner"),
  };
}

export function parseOpportunityParams(
  search: URLSearchParams,
): OpportunityListParams {
  return {
    page: num(search, "page"),
    pageSize: num(search, "pageSize"),
    facets: search.get("facets") === "1" || search.get("facets") === "true",
    search: str(search, "search"),
    stage: str(search, "stage"),
    practice: str(search, "practice"),
    owner: str(search, "owner"),
    priority: str(search, "priority"),
    valueRange: str(search, "valueRange"),
  };
}

export function parseMatterParams(search: URLSearchParams): MatterListParams {
  return {
    page: num(search, "page"),
    pageSize: num(search, "pageSize"),
    facets: search.get("facets") === "1" || search.get("facets") === "true",
    search: str(search, "search"),
    status: str(search, "status"),
    risk: str(search, "risk"),
    practice: str(search, "practice"),
    owner: str(search, "owner"),
    deadline: str(search, "deadline"),
  };
}

export function parseTaskParams(search: URLSearchParams): TaskListParams {
  return {
    page: num(search, "page"),
    pageSize: num(search, "pageSize"),
    facets: search.get("facets") === "1" || search.get("facets") === "true",
    search: str(search, "search"),
    status: str(search, "status"),
    priority: str(search, "priority"),
    owner: str(search, "owner"),
    type: str(search, "type"),
    due: str(search, "due"),
  };
}