import type {
  AccountListParams,
  LeadListParams,
  MatterListParams,
  OpportunityListParams,
  PaginatedResult,
  TaskListParams,
} from "../../../shared/agro/list-types.js";
import type {
  Account,
  Activity,
  CrmStats,
  Deadline,
  AgroUser,
  Lead,
  Matter,
  Opportunity,
  PracticeBreakdown,
  RegionPortfolio,
  Task,
  TaskStatus,
} from "../../../shared/agro/types.js";
import { getSql } from "./client.js";
import {
  mapAccount,
  mapActivity,
  mapDeadline,
  mapLead,
  mapMatter,
  mapOpportunity,
  mapTask,
} from "./mappers.js";
import { toJsonArray } from "./json-utils.js";
import { OPPORTUNITY_STAGES } from "../../../shared/agro/seed.js";

function uuidPrefix(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function sqlLikeTerm(value: string) {
  return `%${value.replace(/[%_]/g, "\\$&")}%`;
}

type WhereParts = { clauses: string[]; values: unknown[] };

function appendPagination(limit: number, offset: number, values: unknown[]) {
  return { text: `LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, values: [...values, limit, offset] };
}

export async function dbListLeads(
  params: LeadListParams = {},
): Promise<PaginatedResult<Lead>> {
  const sql = getSql();
  const where: WhereParts = { clauses: [], values: [] };
  if (params.status) { where.clauses.push(`status = $${where.values.length + 1}`); where.values.push(params.status); }
  if (params.owner) { where.clauses.push(`owner ILIKE $${where.values.length + 1}`); where.values.push(sqlLikeTerm(params.owner)); }
  if (params.region) { where.clauses.push(`region = $${where.values.length + 1}`); where.values.push(params.region); }
  if (params.source) { where.clauses.push(`source = $${where.values.length + 1}`); where.values.push(params.source); }
  if (params.crop) { where.clauses.push(`crop ILIKE $${where.values.length + 1}`); where.values.push(sqlLikeTerm(params.crop)); }
  if (params.search?.trim()) {
    const term = sqlLikeTerm(params.search);
    where.clauses.push(`(name ILIKE $${where.values.length + 1} OR contact ILIKE $${where.values.length + 2} OR notes ILIKE $${where.values.length + 3})`);
    where.values.push(term, term, term);
  }
  const whereSql = where.clauses.length
    ? `WHERE deleted_at IS NULL AND ${where.clauses.join(" AND ")}`
    : "WHERE deleted_at IS NULL";
  const countRows = await sql.query(`SELECT COUNT(*)::int AS c FROM agro.leads ${whereSql}`, where.values);
  const total = Number(countRows[0].c);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(params.pageSize ?? 20, 100);
  const offset = (page - 1) * pageSize;
  const { text: pagText, values: pagValues } = appendPagination(pageSize, offset, where.values);
  const rows = await sql.query(
    `SELECT * FROM agro.leads ${whereSql} ORDER BY created_at DESC ${pagText}`,
    pagValues,
  );
  const items = rows.map((r) => mapLead(r as Record<string, unknown>));
  const result: PaginatedResult<Lead> = {
    items,
    total,
    page,
    pageSize,
  };
  if (params.facets) {
    result.facets = await dbLeadFacets();
  }
  return result;
}

export async function dbGetLead(id: string): Promise<Lead | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.leads WHERE id = ${id} AND deleted_at IS NULL`;
  if (!rows.length) return null;
  return mapLead(rows[0] as Record<string, unknown>);
}

export async function dbCreateLead(
  input: Omit<Lead, "id"> & { id?: string },
): Promise<Lead> {
  const sql = getSql();
  const id = input.id ?? uuidPrefix("LD");
  await sql`
    INSERT INTO agro.leads (
      id, name, contact, region, crop, source, status, owner, account_id,
      next_contact, notes, created_at, lead_type, legal_pain, interest_area, priority
    )
    VALUES (
      ${id}, ${input.name}, ${input.contact}, ${input.region}, ${input.crop},
      ${input.source}, ${input.status}, ${input.owner}, ${input.accountId ?? null},
      ${input.nextContact}, ${input.notes}, ${input.createdAt},
      ${input.leadType ?? null}, ${input.legalPain ?? null},
      ${input.interestArea ?? null}, ${input.priority ?? null}
    )
  `;
  const lead = await dbGetLead(id);
  if (!lead) throw new Error("Falha ao criar lead");
  return lead;
}

export async function dbUpdateLead(
  id: string,
  patch: Partial<Pick<Lead, "status" | "owner" | "nextContact" | "notes" | "name">>,
): Promise<Lead | null> {
  const sql = getSql();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.status !== undefined) { sets.push(`status = $${sets.length + 1}`); values.push(patch.status); }
  if (patch.owner !== undefined) { sets.push(`owner = $${sets.length + 1}`); values.push(patch.owner); }
  if (patch.nextContact !== undefined) { sets.push(`next_contact = $${sets.length + 1}`); values.push(patch.nextContact); }
  if (patch.notes !== undefined) { sets.push(`notes = $${sets.length + 1}`); values.push(patch.notes); }
  if (patch.name !== undefined) { sets.push(`name = $${sets.length + 1}`); values.push(patch.name); }
  if (!sets.length) return dbGetLead(id);
  values.push(id);
  await sql.query(`UPDATE agro.leads SET ${sets.join(", ")}, updated_at = now() WHERE id = $${values.length}`, values);
  return dbGetLead(id);
}

export async function dbDeleteLead(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE agro.leads SET deleted_at = now(), updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL RETURNING id
  `;
  return rows.length > 0;
}

export async function dbListAccounts(
  params: AccountListParams = {},
): Promise<PaginatedResult<Account>> {
  const sql = getSql();
  const where: WhereParts = { clauses: [], values: [] };
  if (params.type) { where.clauses.push(`type = $${where.values.length + 1}`); where.values.push(params.type); }
  if (params.region) { where.clauses.push(`region = $${where.values.length + 1}`); where.values.push(params.region); }
  if (params.owner) { where.clauses.push(`owner ILIKE $${where.values.length + 1}`); where.values.push(sqlLikeTerm(params.owner)); }
  if (params.search?.trim()) {
    const term = sqlLikeTerm(params.search);
    where.clauses.push(`(name ILIKE $${where.values.length + 1} OR main_crop ILIKE $${where.values.length + 2})`);
    where.values.push(term, term);
  }
  const whereSql = where.clauses.length
    ? `WHERE deleted_at IS NULL AND ${where.clauses.join(" AND ")}`
    : "WHERE deleted_at IS NULL";
  const countRows = await sql.query(`SELECT COUNT(*)::int AS c FROM agro.accounts a ${whereSql}`, where.values);
  const total = Number(countRows[0].c);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(params.pageSize ?? 20, 100);
  const offset = (page - 1) * pageSize;
  const { text: pagText, values: pagValues } = appendPagination(pageSize, offset, where.values);
  const rows = await sql.query(
    `SELECT a.*,
      (SELECT COUNT(*)::int FROM agro.matters m WHERE m.account_id = a.id AND m.status != 'concluida') AS active_matters,
      (SELECT COUNT(*)::int FROM agro.opportunities o WHERE o.account_id = a.id AND o.stage NOT IN ('perdido', 'contrato', 'arquivado')) AS active_opportunities
    FROM agro.accounts a ${whereSql} ORDER BY a.name ${pagText}`,
    pagValues,
  );
  const items = rows.map((r) => mapAccount(r as Record<string, unknown>));
  const result: PaginatedResult<Account> = { items, total, page, pageSize };
  if (params.facets) {
    result.facets = await dbAccountFacets();
  }
  return result;
}

export async function dbGetAccount(id: string): Promise<Account | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT a.*,
      (SELECT COUNT(*)::int FROM agro.matters m
        WHERE m.account_id = a.id AND m.status != 'concluida') AS active_matters,
      (SELECT COUNT(*)::int FROM agro.opportunities o
        WHERE o.account_id = a.id AND o.stage NOT IN ('perdido', 'contrato', 'arquivado')) AS active_opportunities
    FROM agro.accounts a
    WHERE a.id = ${id} AND a.deleted_at IS NULL
  `;
  if (!rows.length) return null;
  return mapAccount(rows[0] as Record<string, unknown>);
}

export async function dbGetAccountTimeline(accountId: string) {
  const sql = getSql();
  const [leads, opportunities, matters, tasks] = await Promise.all([
    sql`SELECT * FROM agro.leads WHERE account_id = ${accountId} AND deleted_at IS NULL`,
    sql`SELECT * FROM agro.opportunities WHERE account_id = ${accountId} AND deleted_at IS NULL`,
    sql`SELECT * FROM agro.matters WHERE account_id = ${accountId} AND deleted_at IS NULL`,
    sql`SELECT * FROM agro.tasks WHERE related_to IN (
      SELECT id FROM agro.leads WHERE account_id = ${accountId}
      UNION ALL
      SELECT id FROM agro.opportunities WHERE account_id = ${accountId}
      UNION ALL
      SELECT id FROM agro.matters WHERE account_id = ${accountId}
    ) AND deleted_at IS NULL ORDER BY due_date`,
  ]);

  return {
    leads: leads.map((r) => mapLead(r as Record<string, unknown>)),
    opportunities: opportunities.map((r) => mapOpportunity(r as Record<string, unknown>)),
    matters: matters.map((r) => mapMatter(r as Record<string, unknown>)),
    tasks: tasks.map((r) => mapTask(r as Record<string, unknown>)),
  };
}

export type AccountPatch = Partial<{
  name: string;
  type: Account["type"];
  region: string;
  areaHa: number;
  mainCrop: string;
  owner: string;
  relationshipStatus: Account["relationshipStatus"];
}>;

export async function dbCreateAccount(input: {
  name: string;
  type?: Account["type"];
  region?: string;
  areaHa?: number;
  mainCrop?: string;
  owner: string;
  since?: string;
}): Promise<Account> {
  const sql = getSql();
  const id = uuidPrefix("AC");
  await sql`
    INSERT INTO agro.accounts (
      id, name, type, region, area_ha, main_crop, owner, since, relationship_status
    )
    VALUES (
      ${id}, ${input.name}, ${input.type ?? "produtor"}, ${input.region ?? ""},
      ${input.areaHa ?? 0}, ${input.mainCrop ?? null}, ${input.owner},
      ${input.since ?? null}, ${null}
    )
  `;
  const account = await dbGetAccount(id);
  if (!account) throw new Error("Falha ao criar conta");
  return account;
}

export async function dbUpdateAccount(
  id: string,
  patch: AccountPatch,
): Promise<Account | null> {
  const sql = getSql();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) { sets.push(`name = $${sets.length + 1}`); values.push(patch.name); }
  if (patch.type !== undefined) { sets.push(`type = $${sets.length + 1}`); values.push(patch.type); }
  if (patch.region !== undefined) { sets.push(`region = $${sets.length + 1}`); values.push(patch.region); }
  if (patch.areaHa !== undefined) { sets.push(`area_ha = $${sets.length + 1}`); values.push(patch.areaHa); }
  if (patch.mainCrop !== undefined) { sets.push(`main_crop = $${sets.length + 1}`); values.push(patch.mainCrop); }
  if (patch.owner !== undefined) { sets.push(`owner = $${sets.length + 1}`); values.push(patch.owner); }
  if (patch.relationshipStatus !== undefined) { sets.push(`relationship_status = $${sets.length + 1}`); values.push(patch.relationshipStatus); }
  if (!sets.length) return dbGetAccount(id);
  values.push(id);
  await sql.query(
    `UPDATE agro.accounts SET ${sets.join(", ")}, updated_at = now() WHERE id = $${values.length} AND deleted_at IS NULL`,
    values,
  );
  return dbGetAccount(id);
}

export async function dbDeleteAccount(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE agro.accounts SET deleted_at = now(), updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL RETURNING id
  `;
  return rows.length > 0;
}

export async function dbListOpportunities(
  params: OpportunityListParams = {},
): Promise<PaginatedResult<Opportunity>> {
  const sql = getSql();
  const where: WhereParts = { clauses: [], values: [] };
  if (params.stage) { where.clauses.push(`stage = $${where.values.length + 1}`); where.values.push(params.stage); }
  if (params.practice) { where.clauses.push(`practice ILIKE $${where.values.length + 1}`); where.values.push(sqlLikeTerm(params.practice)); }
  if (params.priority) { where.clauses.push(`priority = $${where.values.length + 1}`); where.values.push(params.priority); }
  if (params.owner) { where.clauses.push(`owner ILIKE $${where.values.length + 1}`); where.values.push(sqlLikeTerm(params.owner)); }
  if (params.valueRange) {
    if (params.valueRange === "baixo") { where.clauses.push(`value_brl < 100000`); }
    else if (params.valueRange === "medio") { where.clauses.push(`value_brl >= 100000 AND value_brl < 500000`); }
    else if (params.valueRange === "alto") { where.clauses.push(`value_brl >= 500000`); }
  }
  if (params.search?.trim()) {
    const term = sqlLikeTerm(params.search);
    where.clauses.push(`(title ILIKE $${where.values.length + 1} OR account_name ILIKE $${where.values.length + 2})`);
    where.values.push(term, term);
  }
  const whereSql = where.clauses.length
    ? `WHERE deleted_at IS NULL AND ${where.clauses.join(" AND ")}`
    : "WHERE deleted_at IS NULL";
  const countRows = await sql.query(`SELECT COUNT(*)::int AS c FROM agro.opportunities ${whereSql}`, where.values);
  const total = Number(countRows[0].c);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(params.pageSize ?? 20, 100);
  const offset = (page - 1) * pageSize;
  const { text: pagText, values: pagValues } = appendPagination(pageSize, offset, where.values);
  const rows = await sql.query(
    `SELECT * FROM agro.opportunities ${whereSql} ORDER BY expected_close ${pagText}`,
    pagValues,
  );
  const items = rows.map((r) => mapOpportunity(r as Record<string, unknown>));
  const result: PaginatedResult<Opportunity> = { items, total, page, pageSize };
  if (params.facets) {
    result.facets = await dbOpportunityFacets();
  }
  return result;
}

export async function dbGetOpportunity(id: string): Promise<Opportunity | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.opportunities WHERE id = ${id} AND deleted_at IS NULL`;
  if (!rows.length) return null;
  return mapOpportunity(rows[0] as Record<string, unknown>);
}

export async function dbListMatters(
  params: MatterListParams = {},
): Promise<PaginatedResult<Matter>> {
  const sql = getSql();
  const where: WhereParts = { clauses: [], values: [] };
  if (params.status) { where.clauses.push(`status = $${where.values.length + 1}`); where.values.push(params.status); }
  if (params.risk) { where.clauses.push(`risk = $${where.values.length + 1}`); where.values.push(params.risk); }
  if (params.practice) { where.clauses.push(`practice ILIKE $${where.values.length + 1}`); where.values.push(sqlLikeTerm(params.practice)); }
  if (params.owner) { where.clauses.push(`owner ILIKE $${where.values.length + 1}`); where.values.push(sqlLikeTerm(params.owner)); }
  if (params.deadline) {
    const today = new Date().toISOString().slice(0, 10);
    if (params.deadline === "vencidas") { where.clauses.push(`deadline < $${where.values.length + 1}`); where.values.push(today); }
    else if (params.deadline === "proximas") {
      const limit = new Date(); limit.setDate(limit.getDate() + 7);
      where.clauses.push(`deadline >= $${where.values.length + 1} AND deadline <= $${where.values.length + 2}`);
      where.values.push(today, limit.toISOString().slice(0, 10));
    } else if (params.deadline === "criticas") { where.clauses.push(`deadline < $${where.values.length + 1} AND risk IN ('alto', 'critico')`); where.values.push(today); }
  }
  if (params.search?.trim()) {
    const term = sqlLikeTerm(params.search);
    where.clauses.push(`(title ILIKE $${where.values.length + 1} OR account_name ILIKE $${where.values.length + 2})`);
    where.values.push(term, term);
  }
  const whereSql = where.clauses.length
    ? `WHERE deleted_at IS NULL AND ${where.clauses.join(" AND ")}`
    : "WHERE deleted_at IS NULL";
  const countRows = await sql.query(`SELECT COUNT(*)::int AS c FROM agro.matters ${whereSql}`, where.values);
  const total = Number(countRows[0].c);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(params.pageSize ?? 20, 100);
  const offset = (page - 1) * pageSize;
  const { text: pagText, values: pagValues } = appendPagination(pageSize, offset, where.values);
  const rows = await sql.query(
    `SELECT * FROM agro.matters ${whereSql} ORDER BY deadline ${pagText}`,
    pagValues,
  );
  const items = rows.map((r) => mapMatter(r as Record<string, unknown>));
  const result: PaginatedResult<Matter> = { items, total, page, pageSize };
  if (params.facets) {
    result.facets = await dbMatterFacets();
  }
  return result;
}

export async function dbGetMatter(id: string): Promise<Matter | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.matters WHERE id = ${id} AND deleted_at IS NULL`;
  if (!rows.length) return null;
  return mapMatter(rows[0] as Record<string, unknown>);
}

export async function dbListTasks(
  params: TaskListParams = {},
): Promise<PaginatedResult<Task>> {
  const sql = getSql();
  const where: WhereParts = { clauses: [], values: [] };
  if (params.status) { where.clauses.push(`status = $${where.values.length + 1}`); where.values.push(params.status); }
  if (params.priority) { where.clauses.push(`priority = $${where.values.length + 1}`); where.values.push(params.priority); }
  if (params.type) { where.clauses.push(`type = $${where.values.length + 1}`); where.values.push(params.type); }
  if (params.owner) { where.clauses.push(`owner ILIKE $${where.values.length + 1}`); where.values.push(sqlLikeTerm(params.owner)); }
  if (params.due) {
    const today = new Date().toISOString().slice(0, 10);
    if (params.due === "hoje") { where.clauses.push(`due_date = $${where.values.length + 1}`); where.values.push(today); }
    else if (params.due === "semana") {
      const limit = new Date(); limit.setDate(limit.getDate() + 7);
      where.clauses.push(`due_date >= $${where.values.length + 1} AND due_date <= $${where.values.length + 2}`);
      where.values.push(today, limit.toISOString().slice(0, 10));
    } else if (params.due === "atrasadas") { where.clauses.push(`due_date < $${where.values.length + 1}`); where.values.push(today); }
  }
  if (params.search?.trim()) { const term = sqlLikeTerm(params.search); where.clauses.push(`title ILIKE $${where.values.length + 1}`); where.values.push(term); }
  const whereSql = where.clauses.length
    ? `WHERE deleted_at IS NULL AND ${where.clauses.join(" AND ")}`
    : "WHERE deleted_at IS NULL";
  const countRows = await sql.query(`SELECT COUNT(*)::int AS c FROM agro.tasks ${whereSql}`, where.values);
  const total = Number(countRows[0].c);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(params.pageSize ?? 20, 100);
  const offset = (page - 1) * pageSize;
  const { text: pagText, values: pagValues } = appendPagination(pageSize, offset, where.values);
  const rows = await sql.query(
    `SELECT * FROM agro.tasks ${whereSql} ORDER BY due_date ${pagText}`,
    pagValues,
  );
  const items = rows.map((r) => mapTask(r as Record<string, unknown>));
  const result: PaginatedResult<Task> = { items, total, page, pageSize };
  if (params.facets) {
    result.facets = await dbTaskFacets();
  }
  return result;
}

export async function dbGetTask(id: string): Promise<Task | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.tasks WHERE id = ${id} AND deleted_at IS NULL`;
  if (!rows.length) return null;
  return mapTask(rows[0] as Record<string, unknown>);
}

export async function dbGetRelatedTasks(entityId: string): Promise<Task[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.tasks WHERE related_to = ${entityId} AND deleted_at IS NULL ORDER BY due_date`;
  return rows.map((r) => mapTask(r as Record<string, unknown>));
}

export async function dbUpdateOpportunity(
  id: string,
  patch: Partial<Pick<Opportunity, "stage" | "priority" | "nextContact">>,
): Promise<Opportunity | null> {
  const sql = getSql();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.stage !== undefined) { sets.push(`stage = $${sets.length + 1}`); values.push(patch.stage); }
  if (patch.priority !== undefined) { sets.push(`priority = $${sets.length + 1}`); values.push(patch.priority); }
  if (patch.nextContact !== undefined) { sets.push(`next_contact = $${sets.length + 1}`); values.push(patch.nextContact); }
  if (!sets.length) return dbGetOpportunity(id);
  values.push(id);
  await sql.query(`UPDATE agro.opportunities SET ${sets.join(", ")}, updated_at = now() WHERE id = $${values.length}`, values);
  return dbGetOpportunity(id);
}

export async function dbCreateOpportunity(input: {
  title: string;
  accountName?: string;
  accountId?: string;
  stage?: Opportunity["stage"];
  valueBrl?: number;
  owner: string;
  expectedClose?: string;
  priority?: Opportunity["priority"];
  practice?: string;
}): Promise<Opportunity> {
  const sql = getSql();
  const id = uuidPrefix("OP");
  await sql`
    INSERT INTO agro.opportunities (
      id, title, account_id, account_name, stage, value_brl, owner,
      expected_close, next_contact, priority, practice
    )
    VALUES (
      ${id}, ${input.title}, ${input.accountId ?? null}, ${input.accountName ?? ""},
      ${input.stage ?? "novo_contato"}, ${input.valueBrl ?? 0}, ${input.owner},
      ${input.expectedClose || null}, ${null}, ${input.priority ?? "normal"},
      ${input.practice ?? null}
    )
  `;
  const opp = await dbGetOpportunity(id);
  if (!opp) throw new Error("Falha ao criar oportunidade");
  return opp;
}

export async function dbDeleteOpportunity(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE agro.opportunities SET deleted_at = now(), updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL RETURNING id
  `;
  return rows.length > 0;
}

export type MatterPatch = Partial<{
  status: Matter["status"];
  risk: Matter["risk"];
  cnjNumber: string | null;
  court: string | null;
  phase: Matter["phase"] | null;
  opposingParty: string | null;
  claimValueBrl: number | null;
  opportunityId: string | null;
  nextSteps: string | null;
}>;

export async function dbUpdateMatter(
  id: string,
  patch: MatterPatch,
): Promise<Matter | null> {
  const sql = getSql();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.status !== undefined) { sets.push(`status = $${sets.length + 1}`); values.push(patch.status); }
  if (patch.risk !== undefined) { sets.push(`risk = $${sets.length + 1}`); values.push(patch.risk); }
  if (patch.cnjNumber !== undefined) { sets.push(`cnj_number = $${sets.length + 1}`); values.push(patch.cnjNumber); }
  if (patch.court !== undefined) { sets.push(`court = $${sets.length + 1}`); values.push(patch.court); }
  if (patch.phase !== undefined) { sets.push(`phase = $${sets.length + 1}`); values.push(patch.phase); }
  if (patch.opposingParty !== undefined) { sets.push(`opposing_party = $${sets.length + 1}`); values.push(patch.opposingParty); }
  if (patch.claimValueBrl !== undefined) { sets.push(`claim_value_brl = $${sets.length + 1}`); values.push(patch.claimValueBrl); }
  if (patch.opportunityId !== undefined) { sets.push(`opportunity_id = $${sets.length + 1}`); values.push(patch.opportunityId); }
  if (patch.nextSteps !== undefined) { sets.push(`next_steps = $${sets.length + 1}`); values.push(patch.nextSteps); }
  if (!sets.length) return dbGetMatter(id);
  values.push(id);
  await sql.query(`UPDATE agro.matters SET ${sets.join(", ")}, updated_at = now() WHERE id = $${values.length}`, values);
  return dbGetMatter(id);
}

export async function dbCreateMatter(input: {
  title: string;
  accountName?: string;
  accountId?: string;
  practice?: string;
  status?: Matter["status"];
  risk?: Matter["risk"];
  deadline?: string;
  owner: string;
  description?: string;
  urgency?: Matter["urgency"];
  cnjNumber?: string;
  court?: string;
  opposingParty?: string;
}): Promise<Matter> {
  const sql = getSql();
  const id = uuidPrefix("MT");
  const fallbackDeadline = new Date().toISOString().slice(0, 10);
  await sql`
    INSERT INTO agro.matters (
      id, title, account_id, account_name, practice, status, risk, deadline,
      owner, description, urgency, cnj_number, court, opposing_party
    )
    VALUES (
      ${id}, ${input.title}, ${input.accountId ?? null}, ${input.accountName ?? ""},
      ${input.practice ?? ""}, ${input.status ?? "aberta"}, ${input.risk ?? "baixo"},
      ${input.deadline || fallbackDeadline}, ${input.owner}, ${input.description ?? null},
      ${input.urgency ?? null}, ${input.cnjNumber ?? null},
      ${input.court ?? null}, ${input.opposingParty ?? null}
    )
  `;
  const matter = await dbGetMatter(id);
  if (!matter) throw new Error("Falha ao criar demanda");
  return matter;
}

export async function dbDeleteMatter(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE agro.matters SET deleted_at = now(), updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL RETURNING id
  `;
  return rows.length > 0;
}

export async function dbGetMattersByOpportunity(
  opportunityId: string,
): Promise<Matter[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM agro.matters WHERE opportunity_id = ${opportunityId} AND deleted_at IS NULL ORDER BY deadline
  `;
  return rows.map((r) => mapMatter(r as Record<string, unknown>));
}

export async function dbUpdateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Task | null> {
  const sql = getSql();
  const rows = await sql`
    UPDATE agro.tasks SET status = ${status}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows.length) return null;
  return mapTask(rows[0] as Record<string, unknown>);
}

export type TaskPatch = Partial<{
  status: Task["status"];
  priority: Task["priority"];
  title: string;
  owner: string;
  dueDate: string;
}>;

export async function dbCreateTask(input: {
  title: string;
  relatedTo?: string;
  type?: Task["type"];
  priority?: Task["priority"];
  dueDate?: string;
  owner: string;
}): Promise<Task> {
  const sql = getSql();
  const id = uuidPrefix("TK");
  const fallbackDue = new Date().toISOString().slice(0, 10);
  const rows = await sql`
    INSERT INTO agro.tasks (id, title, related_to, type, priority, status, due_date, owner)
    VALUES (
      ${id}, ${input.title}, ${input.relatedTo ?? ""}, ${input.type ?? "operacional"},
      ${input.priority ?? "media"}, 'pendente', ${input.dueDate || fallbackDue}, ${input.owner}
    )
    RETURNING *
  `;
  return mapTask(rows[0] as Record<string, unknown>);
}

export async function dbUpdateTask(
  id: string,
  patch: TaskPatch,
): Promise<Task | null> {
  const sql = getSql();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.status !== undefined) { sets.push(`status = $${sets.length + 1}`); values.push(patch.status); }
  if (patch.priority !== undefined) { sets.push(`priority = $${sets.length + 1}`); values.push(patch.priority); }
  if (patch.title !== undefined) { sets.push(`title = $${sets.length + 1}`); values.push(patch.title); }
  if (patch.owner !== undefined) { sets.push(`owner = $${sets.length + 1}`); values.push(patch.owner); }
  if (patch.dueDate !== undefined) { sets.push(`due_date = $${sets.length + 1}`); values.push(patch.dueDate); }
  if (!sets.length) return dbGetTask(id);
  values.push(id);
  await sql.query(
    `UPDATE agro.tasks SET ${sets.join(", ")}, updated_at = now() WHERE id = $${values.length} AND deleted_at IS NULL`,
    values,
  );
  return dbGetTask(id);
}

export async function dbDeleteTask(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE agro.tasks SET deleted_at = now(), updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL RETURNING id
  `;
  return rows.length > 0;
}

/* ---------------------------------------------------------------- Prazos */

export async function dbListDeadlines(matterId?: string): Promise<Deadline[]> {
  const sql = getSql();
  const rows = matterId
    ? await sql`SELECT * FROM agro.deadlines WHERE matter_id = ${matterId} ORDER BY due_date`
    : await sql`SELECT * FROM agro.deadlines ORDER BY due_date`;
  return rows.map((r) => mapDeadline(r as Record<string, unknown>));
}

export async function dbCreateDeadline(
  input: Omit<Deadline, "id"> & { id?: string },
): Promise<Deadline> {
  const sql = getSql();
  const id = input.id ?? uuidPrefix("DL");
  const rows = await sql`
    INSERT INTO agro.deadlines (id, matter_id, title, type, status, due_date, owner, completed_at, notes)
    VALUES (
      ${id}, ${input.matterId}, ${input.title}, ${input.type}, ${input.status},
      ${input.dueDate}, ${input.owner}, ${input.completedAt}, ${input.notes ?? null}
    )
    RETURNING *
  `;
  return mapDeadline(rows[0] as Record<string, unknown>);
}

export async function dbUpdateDeadline(
  id: string,
  patch: Partial<
    Pick<Deadline, "status" | "dueDate" | "completedAt" | "owner"> & {
      notes: string | null;
    }
  >,
): Promise<Deadline | null> {
  const sql = getSql();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.status !== undefined) { sets.push(`status = $${sets.length + 1}`); values.push(patch.status); }
  if (patch.dueDate !== undefined) { sets.push(`due_date = $${sets.length + 1}`); values.push(patch.dueDate); }
  if (patch.completedAt !== undefined) { sets.push(`completed_at = $${sets.length + 1}`); values.push(patch.completedAt); }
  if (patch.owner !== undefined) { sets.push(`owner = $${sets.length + 1}`); values.push(patch.owner); }
  if (patch.notes !== undefined) { sets.push(`notes = $${sets.length + 1}`); values.push(patch.notes); }
  if (!sets.length) {
    const existing = await sql`SELECT * FROM agro.deadlines WHERE id = ${id}`;
    if (!existing.length) return null;
    return mapDeadline(existing[0] as Record<string, unknown>);
  }
  values.push(id);
  const rows = await sql.query(`UPDATE agro.deadlines SET ${sets.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING *`, values);
  if (!rows.length) return null;
  return mapDeadline(rows[0] as Record<string, unknown>);
}

/* ------------------------------------------------------------ Interações */

export async function dbListActivities(
  entityId?: string,
  entityType?: Activity["entityType"],
): Promise<Activity[]> {
  const sql = getSql();
  let rows;
  if (entityId && entityType) {
    rows = await sql`
      SELECT * FROM agro.activities
      WHERE entity_id = ${entityId} AND entity_type = ${entityType}
      ORDER BY date DESC, created_at DESC
      LIMIT 200
    `;
  } else if (entityId) {
    rows = await sql`
      SELECT * FROM agro.activities WHERE entity_id = ${entityId}
      ORDER BY date DESC, created_at DESC
      LIMIT 200
    `;
  } else {
    rows = await sql`SELECT * FROM agro.activities ORDER BY date DESC, created_at DESC LIMIT 200`;
  }
  return rows.map((r) => mapActivity(r as Record<string, unknown>));
}

export async function dbCreateActivity(
  input: Omit<Activity, "id" | "createdAt"> & { id?: string },
): Promise<Activity> {
  const sql = getSql();
  const id = input.id ?? uuidPrefix("ACT");
  const rows = await sql`
    INSERT INTO agro.activities (id, entity_type, entity_id, type, summary, date, owner)
    VALUES (
      ${id}, ${input.entityType}, ${input.entityId}, ${input.type},
      ${input.summary}, ${input.date}, ${input.owner}
    )
    RETURNING *
  `;
  return mapActivity(rows[0] as Record<string, unknown>);
}

/* -------------------------------------------------- Conversão de lead */

export async function dbConvertLead(
  lead: Lead,
  opportunity: Opportunity,
): Promise<Opportunity> {
  const sql = getSql();
  const [result] = await sql.transaction([
    sql`INSERT INTO agro.opportunities (
      id, title, account_id, account_name, stage, value_brl, owner,
      expected_close, next_contact, priority, practice, lead_id
    ) VALUES (
      ${opportunity.id}, ${opportunity.title}, ${opportunity.accountId ?? null},
      ${opportunity.accountName}, ${opportunity.stage}, ${opportunity.valueBrl},
      ${opportunity.owner}, ${opportunity.expectedClose}, ${opportunity.nextContact},
      ${opportunity.priority}, ${opportunity.practice}, ${lead.id}
    )`,
    sql`UPDATE agro.leads SET status = 'qualificado', converted_opportunity_id = ${opportunity.id}, updated_at = now() WHERE id = ${lead.id}`,
  ]);
  const created = Array.isArray(result) && result.length ? await dbGetOpportunity(opportunity.id) : null;
  if (!created) throw new Error("Falha ao converter lead");
  return created;
}

export async function dbNextOpportunityId(): Promise<string> {
  return uuidPrefix("OP");
}

export type CrmDataset = {
  leads: Lead[];
  accounts: Account[];
  opportunities: Opportunity[];
  matters: Matter[];
  tasks: Task[];
  deadlines?: Deadline[];
  activities?: Activity[];
};

export async function dbLoadAll(): Promise<CrmDataset> {
  const sql = getSql();
  const [leads, accounts, opportunities, matters, tasks, deadlines, activities] =
    await Promise.all([
      sql`SELECT * FROM agro.leads WHERE deleted_at IS NULL ORDER BY created_at DESC`,
      sql`SELECT * FROM agro.accounts WHERE deleted_at IS NULL ORDER BY name`,
      sql`SELECT * FROM agro.opportunities WHERE deleted_at IS NULL ORDER BY expected_close`,
      sql`SELECT * FROM agro.matters WHERE deleted_at IS NULL ORDER BY deadline`,
      sql`SELECT * FROM agro.tasks WHERE deleted_at IS NULL ORDER BY due_date`,
      sql`SELECT * FROM agro.deadlines ORDER BY due_date`,
      sql`SELECT * FROM agro.activities ORDER BY date DESC, created_at DESC`,
    ]);
  return {
    leads: leads.map((r) => mapLead(r as Record<string, unknown>)),
    accounts: accounts.map((r) => mapAccount(r as Record<string, unknown>)),
    opportunities: opportunities.map((r) => mapOpportunity(r as Record<string, unknown>)),
    matters: matters.map((r) => mapMatter(r as Record<string, unknown>)),
    tasks: tasks.map((r) => mapTask(r as Record<string, unknown>)),
    deadlines: deadlines.map((r) => mapDeadline(r as Record<string, unknown>)),
    activities: activities.map((r) => mapActivity(r as Record<string, unknown>)),
  };
}

export async function dbCreateAuditLog(input: {
  actor: AgroUser;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO agro.audit_logs (
      actor_id, actor_email, action, entity_type, entity_id, metadata
    )
    VALUES (
      ${input.actor.id}, ${input.actor.email}, ${input.action},
      ${input.entityType}, ${input.entityId ?? null},
      ${JSON.stringify(input.metadata ?? {})}::jsonb
    )
  `;
}

// ── Audit (E-2): persistência completa com before/after/changes/IP/chain hash ──

interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface AuditLogRow {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changes: AuditChange[];
  ip: string | null;
  prevHash: string | null;
  hash: string | null;
}

function mapAuditRow(r: Record<string, unknown>): AuditLogRow {
  return {
    id: String(r.id ?? ""),
    timestamp: String(r.created_at ?? r.timestamp ?? ""),
    userId: String(r.actor_id ?? ""),
    userName: String(r.actor_name ?? r.actor_email ?? ""),
    userRole: String(r.actor_role ?? ""),
    entityType: String(r.entity_type ?? ""),
    entityId: String(r.entity_id ?? ""),
    entityName: String(r.entity_name ?? ""),
    action: String(r.action ?? ""),
    before: (r.before_state as Record<string, unknown> | null) ?? null,
    after: (r.after_state as Record<string, unknown> | null) ?? null,
    changes: (r.changes as AuditChange[] | null) ?? [],
    ip: (r.ip as string | null) ?? null,
    prevHash: (r.prev_hash as string | null) ?? null,
    hash: (r.hash as string | null) ?? null,
  };
}

export async function dbCreateAuditLogFull(input: {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  changes: AuditChange[];
  ip: string | null;
  prevHash: string;
  hash: string;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO agro.audit_logs (
      actor_id, actor_name, actor_role, action, entity_type, entity_id,
      entity_name, before_state, after_state, changes, ip, prev_hash, hash, metadata
    )
    VALUES (
      ${input.actorId}, ${input.actorName}, ${input.actorRole}, ${input.action},
      ${input.entityType}, ${input.entityId}, ${input.entityName},
      ${input.beforeState ? JSON.stringify(input.beforeState) : null}::jsonb,
      ${input.afterState ? JSON.stringify(input.afterState) : null}::jsonb,
      ${JSON.stringify(input.changes ?? [])}::jsonb,
      ${input.ip}, ${input.prevHash}, ${input.hash},
      '{}'::jsonb
    )
  `;
}

export async function dbQueryAuditLogs(filters: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLogRow[]; total: number }> {
  const sql = getSql();
  const where: WhereParts = { clauses: [], values: [] };
  if (filters.entityType) { where.clauses.push(`entity_type = $${where.values.length + 1}`); where.values.push(filters.entityType); }
  if (filters.entityId) { where.clauses.push(`entity_id = $${where.values.length + 1}`); where.values.push(filters.entityId); }
  if (filters.userId) { where.clauses.push(`actor_id = $${where.values.length + 1}`); where.values.push(filters.userId); }
  if (filters.action) { where.clauses.push(`action = $${where.values.length + 1}`); where.values.push(filters.action); }
  if (filters.from) { where.clauses.push(`created_at >= $${where.values.length + 1}`); where.values.push(filters.from); }
  if (filters.to) { where.clauses.push(`created_at <= $${where.values.length + 1}`); where.values.push(filters.to); }
  const whereSql = where.clauses.length ? `WHERE ${where.clauses.join(" AND ")}` : "";

  const countRows = await sql.query(`SELECT COUNT(*)::int AS c FROM agro.audit_logs ${whereSql}`, where.values);
  const total = Number(countRows[0].c);
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const { text: pagText, values: pagValues } = appendPagination(limit, offset, where.values);
  const rows = await sql.query(
    `SELECT * FROM agro.audit_logs ${whereSql} ORDER BY created_at DESC ${pagText}`,
    pagValues,
  );
  return { logs: rows.map((r) => mapAuditRow(r as Record<string, unknown>)), total };
}

export async function dbGetAuditStats(): Promise<{
  totalLogs: number;
  byEntityType: Record<string, number>;
  byAction: Record<string, number>;
  recentActivity: AuditLogRow[];
}> {
  const sql = getSql();
  const totalRows = await sql`SELECT COUNT(*)::int AS c FROM agro.audit_logs`;
  const totalLogs = Number(totalRows[0].c);
  const entRows = await sql`SELECT entity_type, COUNT(*)::int AS c FROM agro.audit_logs GROUP BY entity_type`;
  const actRows = await sql`SELECT action, COUNT(*)::int AS c FROM agro.audit_logs GROUP BY action`;
  const recentRows = await sql`SELECT * FROM agro.audit_logs ORDER BY created_at DESC LIMIT 10`;
  return {
    totalLogs,
    byEntityType: Object.fromEntries(entRows.map((r) => [String(r.entity_type), Number(r.c)])),
    byAction: Object.fromEntries(actRows.map((r) => [String(r.action), Number(r.c)])),
    recentActivity: recentRows.map((r) => mapAuditRow(r as Record<string, unknown>)),
  };
}

// ── CRM Stats (E-8): agregação SQL nativa, substitui loadCrmDataset + computeCrmStats ──
// Antes: SELECT * 7 tabelas + JS. Agora: COUNT/SUM FILTER + GROUP BY + listas
// cirúrgicas (WHERE + LIMIT). Mantém o shape CrmStats para o handler não mudar.

const OPEN_STAGE_LIST = [
  "novo_contato", "diagnostico_agendado", "diagnostico_realizado",
  "proposta_elaboracao", "proposta_enviada", "negociacao",
];
const CLOSED_STAGES_LIST = ["contrato", "perdido", "arquivado"];

export async function dbGetCrmStats(): Promise<CrmStats> {
  const sql = getSql();

  // Scalars — leads + accounts
  const leadRow = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status <> 'descartado')::int AS active_leads,
      COUNT(*) FILTER (WHERE status = 'qualificado')::int AS qualified_leads
    FROM agro.leads WHERE deleted_at IS NULL
  `;
  const activeLeads = Number(leadRow[0].active_leads);
  const qualifiedLeads = Number(leadRow[0].qualified_leads);

  const accRow = await sql`SELECT COUNT(*)::int AS c FROM agro.accounts WHERE deleted_at IS NULL`;
  const activeAccounts = Number(accRow[0].c);

  // Opportunities scalars + pipeline por estágio (GROUP BY)
  const oppRow = await sql`
    SELECT
      COUNT(*) FILTER (WHERE stage NOT IN ${CLOSED_STAGES_LIST})::int AS open_opps,
      COALESCE(SUM(value_brl) FILTER (WHERE stage NOT IN ${CLOSED_STAGES_LIST}), 0)::float8 AS pipeline_value,
      COALESCE(SUM(value_brl) FILTER (WHERE stage = 'contrato'), 0)::float8 AS closed_value
    FROM agro.opportunities WHERE deleted_at IS NULL
  `;
  const openOpportunities = Number(oppRow[0].open_opps);
  const pipelineValue = Number(oppRow[0].pipeline_value);
  const closedValue = Number(oppRow[0].closed_value);

  const stageRows = await sql`
    SELECT stage, COUNT(*)::int AS c, COALESCE(SUM(value_brl), 0)::float8 AS v
    FROM agro.opportunities WHERE deleted_at IS NULL
    GROUP BY stage
  `;
  const stageMap = new Map<string, { count: number; value: number }>();
  for (const r of stageRows) stageMap.set(String(r.stage), { count: Number(r.c), value: Number(r.v) });
  const pipelineByStage = OPPORTUNITY_STAGES
    .filter((s) => s.id !== "perdido")
    .map((s) => {
      const e = stageMap.get(s.id);
      return { id: s.id, label: s.label, count: e?.count ?? 0, value: e?.value ?? 0 };
    });

  // Matters scalars
  const matterRow = await sql`
    SELECT COUNT(*) FILTER (WHERE status <> 'concluida')::int AS active_matters
    FROM agro.matters WHERE deleted_at IS NULL
  `;
  const activeMatters = Number(matterRow[0].active_matters);

  // Tasks scalars
  const taskRow = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'atrasada' OR due_date < current_date)::int AS overdue,
      COUNT(*) FILTER (WHERE due_date >= current_date AND due_date <= current_date + 7)::int AS upcoming
    FROM agro.tasks WHERE deleted_at IS NULL AND status <> 'concluida'
  `;
  const overdueTasks = Number(taskRow[0].overdue);
  const upcomingTasks = Number(taskRow[0].upcoming);

  // practiceBreakdown: matters ativos + opps abertas por practice
  const matterPracticeRows = await sql`
    SELECT practice, COUNT(*)::int AS c
    FROM agro.matters WHERE deleted_at IS NULL AND status <> 'concluida'
    GROUP BY practice
  `;
  const oppPracticeRows = await sql`
    SELECT practice, COUNT(*)::int AS c, COALESCE(SUM(value_brl), 0)::float8 AS v
    FROM agro.opportunities WHERE deleted_at IS NULL AND stage NOT IN ${CLOSED_STAGES_LIST}
    GROUP BY practice
  `;
  const practiceMap = new Map<string, PracticeBreakdown>();
  for (const r of matterPracticeRows) {
    const p = String(r.practice ?? "");
    practiceMap.set(p, { practice: p, matters: Number(r.c), opportunities: 0, pipelineValue: 0 });
  }
  for (const r of oppPracticeRows) {
    const p = String(r.practice ?? "");
    const row = practiceMap.get(p) ?? { practice: p, matters: 0, opportunities: 0, pipelineValue: 0 };
    row.opportunities = Number(r.c);
    row.pipelineValue = Number(r.v);
    practiceMap.set(p, row);
  }
  const practiceBreakdown = [...practiceMap.values()].sort((a, b) => b.pipelineValue - a.pipelineValue);

  // portfolioByRegion: contas por região + pipeline opps abertas por região
  const accRegionRows = await sql`
    SELECT region, COUNT(*)::int AS c FROM agro.accounts WHERE deleted_at IS NULL GROUP BY region
  `;
  const oppRegionRows = await sql`
    SELECT COALESCE(a.region, 'Outros') AS region, COALESCE(SUM(o.value_brl), 0)::float8 AS v
    FROM agro.opportunities o
    LEFT JOIN agro.accounts a ON a.id = o.account_id
    WHERE o.deleted_at IS NULL AND o.stage NOT IN ${CLOSED_STAGES_LIST}
    GROUP BY COALESCE(a.region, 'Outros')
  `;
  const regionMap = new Map<string, RegionPortfolio>();
  for (const r of accRegionRows) {
    const region = String(r.region ?? "Outros");
    regionMap.set(region, { region, accounts: Number(r.c), pipelineValue: 0 });
  }
  for (const r of oppRegionRows) {
    const region = String(r.region ?? "Outros");
    const row = regionMap.get(region) ?? { region, accounts: 0, pipelineValue: 0 };
    row.pipelineValue = Number(r.v);
    regionMap.set(region, row);
  }
  const portfolioByRegion = [...regionMap.values()].sort((a, b) => b.pipelineValue - a.pipelineValue);

  // Listas cirúrgicas (WHERE + LIMIT + ORDER BY) em vez de SELECT *
  const priorityOppRows = await sql`
    SELECT * FROM agro.opportunities
    WHERE deleted_at IS NULL
      AND (priority = 'alta' OR stage IN ${OPEN_STAGE_LIST})
    ORDER BY value_brl DESC LIMIT 5
  `;
  const priorityOpportunities = priorityOppRows.map((r) => mapOpportunity(r as Record<string, unknown>));

  const riskRows = await sql`
    SELECT * FROM agro.matters
    WHERE deleted_at IS NULL AND status <> 'concluida' AND risk IN ('alto', 'critico')
    ORDER BY deadline ASC
  `;
  const riskAlerts = riskRows.map((r) => mapMatter(r as Record<string, unknown>));

  const upcomingMatterRows = await sql`
    SELECT * FROM agro.matters
    WHERE deleted_at IS NULL AND status <> 'concluida' AND deadline <= current_date + 14
    ORDER BY deadline ASC
  `;
  const upcomingMatters = upcomingMatterRows.map((r) => mapMatter(r as Record<string, unknown>));

  const overdueTaskRows = await sql`
    SELECT * FROM agro.tasks
    WHERE deleted_at IS NULL AND status <> 'concluida' AND (status = 'atrasada' OR due_date < current_date)
    ORDER BY due_date ASC
  `;
  const overdueTasksList = overdueTaskRows.map((r) => mapTask(r as Record<string, unknown>));

  const upcomingTaskRows = await sql`
    SELECT * FROM agro.tasks
    WHERE deleted_at IS NULL AND status <> 'concluida'
      AND due_date >= current_date AND due_date <= current_date + 7
    ORDER BY due_date ASC
  `;
  const upcomingTasksList = upcomingTaskRows.map((r) => mapTask(r as Record<string, unknown>));

  // upcomingContacts: leads ativos + opps abertas com next_contact nos próximos 14 dias
  const leadContactRows = await sql`
    SELECT id, name, owner, next_contact FROM agro.leads
    WHERE deleted_at IS NULL AND status <> 'descartado'
      AND next_contact IS NOT NULL AND next_contact >= current_date AND next_contact <= current_date + 14
    ORDER BY next_contact ASC
  `;
  const oppContactRows = await sql`
    SELECT id, account_name, owner, next_contact FROM agro.opportunities
    WHERE deleted_at IS NULL AND stage NOT IN ${CLOSED_STAGES_LIST}
      AND next_contact IS NOT NULL AND next_contact >= current_date AND next_contact <= current_date + 14
    ORDER BY next_contact ASC
  `;
  const upcomingContacts = [
    ...leadContactRows.map((r) => ({
      id: String(r.id),
      entityType: "lead" as const,
      name: "Contato comercial",
      accountOrLead: String(r.name ?? ""),
      date: String(r.next_contact),
      owner: String(r.owner ?? ""),
      channel: "Reunião / call",
    })),
    ...oppContactRows.map((r) => ({
      id: String(r.id),
      entityType: "oportunidade" as const,
      name: "Follow-up negocial",
      accountOrLead: String(r.account_name ?? ""),
      date: String(r.next_contact),
      owner: String(r.owner ?? ""),
      channel: "Proposta / alinhamento",
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return {
    activeLeads,
    activeAccounts,
    openOpportunities,
    pipelineValue,
    closedValue,
    activeMatters,
    overdueTasks,
    upcomingTasks,
    qualifiedLeads,
    pipelineByStage,
    practiceBreakdown,
    portfolioByRegion,
    priorityOpportunities,
    riskAlerts,
    upcomingMatters,
    upcomingContacts,
    overdueTasksList,
    upcomingTasksList,
  };
}

export async function dbSeedEmpty(): Promise<boolean> {
  const sql = getSql();
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM agro.accounts`;
  return Number(count) === 0;
}

export async function dbUpsertSeed(data: CrmDataset) {
  const sql = getSql();

  for (const a of data.accounts) {
    await sql`
      INSERT INTO agro.accounts (
        id, name, type, region, area_ha, main_crop, owner, since,
        properties, contacts, contracted_areas, mapped_risks, relationship_status
      )
      VALUES (
        ${a.id}, ${a.name}, ${a.type}, ${a.region}, ${a.areaHa}, ${a.mainCrop}, ${a.owner}, ${a.since},
        ${toJsonArray(a.properties)}, ${toJsonArray(a.contacts)},
        ${toJsonArray(a.contractedAreas)}, ${toJsonArray(a.mappedRisks)},
        ${a.relationshipStatus ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, type = EXCLUDED.type, region = EXCLUDED.region,
        area_ha = EXCLUDED.area_ha, main_crop = EXCLUDED.main_crop,
        owner = EXCLUDED.owner, since = EXCLUDED.since,
        properties = EXCLUDED.properties, contacts = EXCLUDED.contacts,
        contracted_areas = EXCLUDED.contracted_areas, mapped_risks = EXCLUDED.mapped_risks,
        relationship_status = EXCLUDED.relationship_status, updated_at = now()
    `;
  }

  for (const l of data.leads) {
    await sql`
      INSERT INTO agro.leads (
        id, name, contact, region, crop, source, status, owner, account_id,
        next_contact, notes, created_at, lead_type, legal_pain, interest_area, priority,
        converted_opportunity_id
      )
      VALUES (
        ${l.id}, ${l.name}, ${l.contact}, ${l.region}, ${l.crop}, ${l.source}, ${l.status},
        ${l.owner}, ${l.accountId ?? null}, ${l.nextContact}, ${l.notes}, ${l.createdAt},
        ${l.leadType ?? null}, ${l.legalPain ?? null}, ${l.interestArea ?? null}, ${l.priority ?? null},
        ${l.convertedOpportunityId ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, status = EXCLUDED.status, owner = EXCLUDED.owner,
        next_contact = EXCLUDED.next_contact, notes = EXCLUDED.notes,
        lead_type = EXCLUDED.lead_type, legal_pain = EXCLUDED.legal_pain,
        interest_area = EXCLUDED.interest_area, priority = EXCLUDED.priority,
        converted_opportunity_id = EXCLUDED.converted_opportunity_id,
        updated_at = now()
    `;
  }

  for (const o of data.opportunities) {
    await sql`
      INSERT INTO agro.opportunities (
        id, title, account_id, account_name, stage, value_brl, owner,
        expected_close, next_contact, priority, practice, probability, next_step, lead_id
      )
      VALUES (
        ${o.id}, ${o.title}, ${o.accountId ?? null}, ${o.accountName}, ${o.stage},
        ${o.valueBrl}, ${o.owner}, ${o.expectedClose}, ${o.nextContact},
        ${o.priority}, ${o.practice}, ${o.probability ?? null}, ${o.nextStep ?? null},
        ${o.leadId ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, stage = EXCLUDED.stage, value_brl = EXCLUDED.value_brl,
        next_contact = EXCLUDED.next_contact, priority = EXCLUDED.priority,
        practice = EXCLUDED.practice, probability = EXCLUDED.probability,
        next_step = EXCLUDED.next_step, lead_id = EXCLUDED.lead_id, updated_at = now()
    `;
  }

  for (const m of data.matters) {
    await sql`
      INSERT INTO agro.matters (
        id, title, account_id, account_name, practice, status, risk, deadline,
        owner, description, urgency, pending_documents, next_steps,
        cnj_number, court, phase, opposing_party, claim_value_brl, opportunity_id
      )
      VALUES (
        ${m.id}, ${m.title}, ${m.accountId ?? null}, ${m.accountName}, ${m.practice},
        ${m.status}, ${m.risk}, ${m.deadline}, ${m.owner}, ${m.description},
        ${m.urgency ?? null}, ${toJsonArray(m.pendingDocuments)}, ${m.nextSteps ?? null},
        ${m.cnjNumber ?? null}, ${m.court ?? null}, ${m.phase ?? null},
        ${m.opposingParty ?? null}, ${m.claimValueBrl ?? null}, ${m.opportunityId ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, risk = EXCLUDED.risk, deadline = EXCLUDED.deadline,
        urgency = EXCLUDED.urgency, pending_documents = EXCLUDED.pending_documents,
        next_steps = EXCLUDED.next_steps,
        cnj_number = EXCLUDED.cnj_number, court = EXCLUDED.court,
        phase = EXCLUDED.phase, opposing_party = EXCLUDED.opposing_party,
        claim_value_brl = EXCLUDED.claim_value_brl,
        opportunity_id = EXCLUDED.opportunity_id, updated_at = now()
    `;
  }

  for (const t of data.tasks) {
    await sql`
      INSERT INTO agro.tasks (id, title, related_to, type, priority, status, due_date, owner)
      VALUES (${t.id}, ${t.title}, ${t.relatedTo}, ${t.type}, ${t.priority}, ${t.status}, ${t.dueDate}, ${t.owner})
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, priority = EXCLUDED.priority, due_date = EXCLUDED.due_date, updated_at = now()
    `;
  }

  for (const d of data.deadlines ?? []) {
    await sql`
      INSERT INTO agro.deadlines (id, matter_id, title, type, status, due_date, owner, completed_at, notes)
      VALUES (
        ${d.id}, ${d.matterId}, ${d.title}, ${d.type}, ${d.status},
        ${d.dueDate}, ${d.owner}, ${d.completedAt}, ${d.notes ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, type = EXCLUDED.type, status = EXCLUDED.status,
        due_date = EXCLUDED.due_date, owner = EXCLUDED.owner,
        completed_at = EXCLUDED.completed_at, notes = EXCLUDED.notes, updated_at = now()
    `;
  }

  for (const act of data.activities ?? []) {
    await sql`
      INSERT INTO agro.activities (id, entity_type, entity_id, type, summary, date, owner)
      VALUES (
        ${act.id}, ${act.entityType}, ${act.entityId}, ${act.type},
        ${act.summary}, ${act.date}, ${act.owner}
      )
      ON CONFLICT (id) DO UPDATE SET
        summary = EXCLUDED.summary, date = EXCLUDED.date, owner = EXCLUDED.owner
    `;
  }
}

// ── Facets (E-9): SELECT DISTINCT por coluna, substitui re-SELECT * + JS ──

async function distinctSorted(
  table: string,
  column: string,
  extraWhere = "deleted_at IS NULL",
): Promise<string[]> {
  const sql = getSql();
  const where = extraWhere ? `WHERE ${extraWhere}` : "";
  const rows = await sql.query(
    `SELECT DISTINCT ${column} AS v FROM ${table} ${where} AND ${column} IS NOT NULL ORDER BY ${column}`,
    [],
  ).catch(async () => {
    // fallback se a tabela nao tem deleted_at
    const rows2 = await sql.query(`SELECT DISTINCT ${column} AS v FROM ${table} WHERE ${column} IS NOT NULL ORDER BY ${column}`);
    return rows2;
  });
  return rows.map((r) => String(r.v));
}

export async function dbLeadFacets(): Promise<Record<string, string[]>> {
  const [regions, sources, crops, owners] = await Promise.all([
    distinctSorted("agro.leads", "region"),
    distinctSorted("agro.leads", "source"),
    distinctSorted("agro.leads", "crop"),
    distinctSorted("agro.leads", "owner"),
  ]);
  return { regions, sources, crops, owners };
}

export async function dbAccountFacets(): Promise<Record<string, string[]>> {
  const [regions, owners] = await Promise.all([
    distinctSorted("agro.accounts", "region"),
    distinctSorted("agro.accounts", "owner"),
  ]);
  return { regions, owners };
}

export async function dbOpportunityFacets(): Promise<Record<string, string[]>> {
  const [practices, owners] = await Promise.all([
    distinctSorted("agro.opportunities", "practice"),
    distinctSorted("agro.opportunities", "owner"),
  ]);
  return { practices, owners };
}

export async function dbMatterFacets(): Promise<Record<string, string[]>> {
  const [practices, owners] = await Promise.all([
    distinctSorted("agro.matters", "practice"),
    distinctSorted("agro.matters", "owner"),
  ]);
  return { practices, owners };
}

export async function dbTaskFacets(): Promise<Record<string, string[]>> {
  const [owners] = await Promise.all([
    distinctSorted("agro.tasks", "owner"),
  ]);
  return { owners };
}

// ── Users (E-11): identidade em agro.users ────────────────────────────

export async function dbFindUserByEmail(email: string): Promise<AgroUser | null> {
  const sql = getSql();
  const rows = await sql`SELECT id, email, name, role FROM agro.users WHERE lower(email) = lower(${email}) LIMIT 1`;
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: String(r.id),
    email: String(r.email),
    name: String(r.name),
    role: String(r.role) as AgroUser["role"],
  };
}

export async function dbUpsertUsers(users: Array<AgroUser & { passwordHash?: string | null; salt?: string | null }>) {
  const sql = getSql();
  for (const u of users) {
    await sql`
      INSERT INTO agro.users (id, email, name, role, password_hash, salt)
      VALUES (${u.id}, ${u.email}, ${u.name}, ${u.role}, ${u.passwordHash ?? null}, ${u.salt ?? null})
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        password_hash = COALESCE(EXCLUDED.password_hash, agro.users.password_hash),
        salt = COALESCE(EXCLUDED.salt, agro.users.salt),
        updated_at = now()
    `;
  }
}
