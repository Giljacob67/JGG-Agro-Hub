import type { VercelRequest } from "@vercel/node";
import {
  MAX_PAGE_SIZE,
  type AccountListParams,
  type LeadListParams,
  type MatterListParams,
  type OpportunityListParams,
  type SortDir,
  type TaskListParams,
} from "../../shared/agro/list-types.js";

function str(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function num(value: string | string[] | undefined): number | undefined {
  const v = str(value);
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function pageSize(value: string | string[] | undefined): number | undefined {
  const n = num(value);
  if (!n) return undefined;
  return Math.min(n, MAX_PAGE_SIZE);
}

function bool(value: string | string[] | undefined): boolean | undefined {
  const v = str(value);
  if (!v) return undefined;
  return v === "1" || v === "true";
}

function dir(value: string | string[] | undefined): SortDir | undefined {
  const v = str(value);
  return v === "desc" ? "desc" : v === "asc" ? "asc" : undefined;
}

export function parseLeadListQuery(req: VercelRequest): LeadListParams {
  return {
    page: num(req.query.page),
    pageSize: pageSize(req.query.pageSize),
    facets: bool(req.query.facets),
    search: str(req.query.search),
    status: str(req.query.status),
    region: str(req.query.region),
    source: str(req.query.source),
    crop: str(req.query.crop),
    owner: str(req.query.owner),
    listId: str(req.query.listId),
    sort: str(req.query.sort),
    dir: dir(req.query.dir),
  };
}

export function parseAccountListQuery(req: VercelRequest): AccountListParams {
  return {
    page: num(req.query.page),
    pageSize: pageSize(req.query.pageSize),
    facets: bool(req.query.facets),
    search: str(req.query.search),
    type: str(req.query.type),
    region: str(req.query.region),
    owner: str(req.query.owner),
    sort: str(req.query.sort),
    dir: dir(req.query.dir),
  };
}

export function parseOpportunityListQuery(
  req: VercelRequest,
): OpportunityListParams {
  return {
    page: num(req.query.page),
    pageSize: pageSize(req.query.pageSize),
    facets: bool(req.query.facets),
    search: str(req.query.search),
    stage: str(req.query.stage),
    practice: str(req.query.practice),
    owner: str(req.query.owner),
    priority: str(req.query.priority),
    valueRange: str(req.query.valueRange),
    sort: str(req.query.sort),
    dir: dir(req.query.dir),
  };
}

export function parseMatterListQuery(req: VercelRequest): MatterListParams {
  return {
    page: num(req.query.page),
    pageSize: pageSize(req.query.pageSize),
    facets: bool(req.query.facets),
    search: str(req.query.search),
    status: str(req.query.status),
    risk: str(req.query.risk),
    practice: str(req.query.practice),
    owner: str(req.query.owner),
    deadline: str(req.query.deadline),
    sort: str(req.query.sort),
    dir: dir(req.query.dir),
  };
}

export function parseTaskListQuery(req: VercelRequest): TaskListParams {
  return {
    page: num(req.query.page),
    pageSize: pageSize(req.query.pageSize),
    facets: bool(req.query.facets),
    search: str(req.query.search),
    status: str(req.query.status),
    priority: str(req.query.priority),
    owner: str(req.query.owner),
    type: str(req.query.type),
    due: str(req.query.due),
    sort: str(req.query.sort),
    dir: dir(req.query.dir),
  };
}