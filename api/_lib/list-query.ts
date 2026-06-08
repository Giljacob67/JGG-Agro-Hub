import type { VercelRequest } from "@vercel/node";
import type {
  AccountListParams,
  LeadListParams,
  MatterListParams,
  OpportunityListParams,
  TaskListParams,
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

function bool(value: string | string[] | undefined): boolean | undefined {
  const v = str(value);
  if (!v) return undefined;
  return v === "1" || v === "true";
}

export function parseLeadListQuery(req: VercelRequest): LeadListParams {
  return {
    page: num(req.query.page),
    pageSize: num(req.query.pageSize),
    facets: bool(req.query.facets),
    search: str(req.query.search),
    status: str(req.query.status),
    region: str(req.query.region),
    source: str(req.query.source),
    crop: str(req.query.crop),
    owner: str(req.query.owner),
  };
}

export function parseAccountListQuery(req: VercelRequest): AccountListParams {
  return {
    page: num(req.query.page),
    pageSize: num(req.query.pageSize),
    facets: bool(req.query.facets),
    search: str(req.query.search),
    type: str(req.query.type),
    region: str(req.query.region),
    owner: str(req.query.owner),
  };
}

export function parseOpportunityListQuery(
  req: VercelRequest,
): OpportunityListParams {
  return {
    page: num(req.query.page),
    pageSize: num(req.query.pageSize),
    facets: bool(req.query.facets),
    search: str(req.query.search),
    stage: str(req.query.stage),
    practice: str(req.query.practice),
    owner: str(req.query.owner),
    priority: str(req.query.priority),
    valueRange: str(req.query.valueRange),
  };
}

export function parseMatterListQuery(req: VercelRequest): MatterListParams {
  return {
    page: num(req.query.page),
    pageSize: num(req.query.pageSize),
    facets: bool(req.query.facets),
    search: str(req.query.search),
    status: str(req.query.status),
    risk: str(req.query.risk),
    practice: str(req.query.practice),
    owner: str(req.query.owner),
    deadline: str(req.query.deadline),
  };
}

export function parseTaskListQuery(req: VercelRequest): TaskListParams {
  return {
    page: num(req.query.page),
    pageSize: num(req.query.pageSize),
    facets: bool(req.query.facets),
    search: str(req.query.search),
    status: str(req.query.status),
    priority: str(req.query.priority),
    owner: str(req.query.owner),
    type: str(req.query.type),
    due: str(req.query.due),
  };
}