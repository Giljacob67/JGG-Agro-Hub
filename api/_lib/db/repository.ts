import {
  buildAccountFacets,
  buildLeadFacets,
  buildMatterFacets,
  buildOpportunityFacets,
  buildTaskFacets,
} from "../../../shared/agro/filters.js";
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
  Deadline,
  AgroUser,
  Lead,
  Matter,
  Opportunity,
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
  const whereSql = where.clauses.length ? `WHERE ${where.clauses.join(" AND ")}` : "";
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
    const allRows = await sql`SELECT * FROM agro.leads ORDER BY created_at DESC`;
    const all = allRows.map((r) => mapLead(r as Record<string, unknown>));
    result.facets = buildLeadFacets(all);
  }
  return result;
}

export async function dbGetLead(id: string): Promise<Lead | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.leads WHERE id = ${id}`;
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
  const whereSql = where.clauses.length ? `WHERE ${where.clauses.join(" AND ")}` : "";
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
    const allRows = await sql`SELECT * FROM agro.accounts ORDER BY name`;
    const all = allRows.map((r) => mapAccount(r as Record<string, unknown>));
    result.facets = buildAccountFacets(all);
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
    WHERE a.id = ${id}
  `;
  if (!rows.length) return null;
  return mapAccount(rows[0] as Record<string, unknown>);
}

export async function dbGetAccountTimeline(accountId: string) {
  const sql = getSql();
  const [leads, opportunities, matters, tasks] = await Promise.all([
    sql`SELECT * FROM agro.leads WHERE account_id = ${accountId}`,
    sql`SELECT * FROM agro.opportunities WHERE account_id = ${accountId}`,
    sql`SELECT * FROM agro.matters WHERE account_id = ${accountId}`,
    sql`SELECT * FROM agro.tasks WHERE related_to IN (
      SELECT id FROM agro.leads WHERE account_id = ${accountId}
      UNION ALL
      SELECT id FROM agro.opportunities WHERE account_id = ${accountId}
      UNION ALL
      SELECT id FROM agro.matters WHERE account_id = ${accountId}
    ) ORDER BY due_date`,
  ]);

  return {
    leads: leads.map((r) => mapLead(r as Record<string, unknown>)),
    opportunities: opportunities.map((r) => mapOpportunity(r as Record<string, unknown>)),
    matters: matters.map((r) => mapMatter(r as Record<string, unknown>)),
    tasks: tasks.map((r) => mapTask(r as Record<string, unknown>)),
  };
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
  const whereSql = where.clauses.length ? `WHERE ${where.clauses.join(" AND ")}` : "";
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
    const allRows = await sql`SELECT * FROM agro.opportunities ORDER BY expected_close`;
    const all = allRows.map((r) => mapOpportunity(r as Record<string, unknown>));
    result.facets = buildOpportunityFacets(all);
  }
  return result;
}

export async function dbGetOpportunity(id: string): Promise<Opportunity | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.opportunities WHERE id = ${id}`;
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
  const whereSql = where.clauses.length ? `WHERE ${where.clauses.join(" AND ")}` : "";
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
    const allRows = await sql`SELECT * FROM agro.matters ORDER BY deadline`;
    const all = allRows.map((r) => mapMatter(r as Record<string, unknown>));
    result.facets = buildMatterFacets(all);
  }
  return result;
}

export async function dbGetMatter(id: string): Promise<Matter | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.matters WHERE id = ${id}`;
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
  const whereSql = where.clauses.length ? `WHERE ${where.clauses.join(" AND ")}` : "";
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
    const allRows = await sql`SELECT * FROM agro.tasks ORDER BY due_date`;
    const all = allRows.map((r) => mapTask(r as Record<string, unknown>));
    result.facets = buildTaskFacets(all);
  }
  return result;
}

export async function dbGetTask(id: string): Promise<Task | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.tasks WHERE id = ${id}`;
  if (!rows.length) return null;
  return mapTask(rows[0] as Record<string, unknown>);
}

export async function dbGetRelatedTasks(entityId: string): Promise<Task[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.tasks WHERE related_to = ${entityId} ORDER BY due_date`;
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

export async function dbGetMattersByOpportunity(
  opportunityId: string,
): Promise<Matter[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM agro.matters WHERE opportunity_id = ${opportunityId} ORDER BY deadline
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
      sql`SELECT * FROM agro.leads ORDER BY created_at DESC`,
      sql`SELECT * FROM agro.accounts ORDER BY name`,
      sql`SELECT * FROM agro.opportunities ORDER BY expected_close`,
      sql`SELECT * FROM agro.matters ORDER BY deadline`,
      sql`SELECT * FROM agro.tasks ORDER BY due_date`,
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
