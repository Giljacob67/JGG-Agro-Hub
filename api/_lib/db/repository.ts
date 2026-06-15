import {
  buildAccountFacets,
  buildLeadFacets,
  buildMatterFacets,
  buildOpportunityFacets,
  buildTaskFacets,
  filterAccounts,
  filterLeads,
  filterMatters,
  filterOpportunities,
  filterTasks,
} from "../../../shared/agro/filters.js";
import type {
  AccountListParams,
  LeadListParams,
  MatterListParams,
  OpportunityListParams,
  PaginatedResult,
  TaskListParams,
} from "../../../shared/agro/list-types.js";
import { paginate } from "../../../shared/agro/list-types.js";
import type {
  Account,
  Activity,
  Deadline,
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

export async function dbListLeads(
  params: LeadListParams = {},
): Promise<PaginatedResult<Lead>> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.leads ORDER BY created_at DESC`;
  const leads = rows.map((r) => mapLead(r as Record<string, unknown>));
  const filtered = filterLeads(leads, params);
  const result = paginate(filtered, params);
  if (params.facets) result.facets = buildLeadFacets(leads);
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
  const id =
    input.id ??
    `LD-${String((await sql`SELECT COUNT(*)::int AS c FROM agro.leads`)[0].c + 1).padStart(3, "0")}`;
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
  const existing = await dbGetLead(id);
  if (!existing) return null;

  await sql`
    UPDATE agro.leads SET
      status = ${patch.status ?? existing.status},
      owner = ${patch.owner ?? existing.owner},
      next_contact = ${patch.nextContact !== undefined ? patch.nextContact : existing.nextContact},
      notes = ${patch.notes ?? existing.notes},
      name = ${patch.name ?? existing.name},
      updated_at = now()
    WHERE id = ${id}
  `;
  return dbGetLead(id);
}

export async function dbListAccounts(
  params: AccountListParams = {},
): Promise<PaginatedResult<Account>> {
  const sql = getSql();
  const rows = await sql`
    SELECT a.*,
      (SELECT COUNT(*)::int FROM agro.matters m
        WHERE m.account_id = a.id AND m.status != 'concluida') AS active_matters,
      (SELECT COUNT(*)::int FROM agro.opportunities o
        WHERE o.account_id = a.id AND o.stage NOT IN ('perdido', 'contrato', 'arquivado')) AS active_opportunities
    FROM agro.accounts a
    ORDER BY a.name
  `;
  const accounts = rows.map((r) => mapAccount(r as Record<string, unknown>));
  const filtered = filterAccounts(accounts, params);
  const result = paginate(filtered, params);
  if (params.facets) result.facets = buildAccountFacets(accounts);
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
  const [leads, opportunities, matters] = await Promise.all([
    sql`SELECT * FROM agro.leads WHERE account_id = ${accountId}`,
    sql`SELECT * FROM agro.opportunities WHERE account_id = ${accountId}`,
    sql`SELECT * FROM agro.matters WHERE account_id = ${accountId}`,
  ]);

  const allTasks = (await dbListTasks({ pageSize: 10_000 })).items;
  const oppIds = new Set(opportunities.map((o) => String((o as Record<string, unknown>).id)));
  const matterIds = new Set(matters.map((m) => String((m as Record<string, unknown>).id)));
  const leadIds = new Set(leads.map((l) => String((l as Record<string, unknown>).id)));

  const tasks = allTasks.filter((t) => {
    if (leadIds.has(t.relatedTo)) return true;
    if (oppIds.has(t.relatedTo)) return true;
    if (matterIds.has(t.relatedTo)) return true;
    return false;
  });

  return {
    leads: leads.map((r) => mapLead(r as Record<string, unknown>)),
    opportunities: opportunities.map((r) =>
      mapOpportunity(r as Record<string, unknown>),
    ),
    matters: matters.map((r) => mapMatter(r as Record<string, unknown>)),
    tasks,
  };
}

export async function dbListOpportunities(
  params: OpportunityListParams = {},
): Promise<PaginatedResult<Opportunity>> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.opportunities ORDER BY expected_close`;
  const opportunities = rows.map((r) =>
    mapOpportunity(r as Record<string, unknown>),
  );
  const filtered = filterOpportunities(opportunities, params);
  const result = paginate(filtered, params);
  if (params.facets) result.facets = buildOpportunityFacets(opportunities);
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
  const rows = await sql`SELECT * FROM agro.matters ORDER BY deadline`;
  const matters = rows.map((r) => mapMatter(r as Record<string, unknown>));
  const filtered = filterMatters(matters, params);
  const result = paginate(filtered, params);
  if (params.facets) result.facets = buildMatterFacets(matters);
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
  const rows = await sql`SELECT * FROM agro.tasks ORDER BY due_date`;
  const tasks = rows.map((r) => mapTask(r as Record<string, unknown>));
  const filtered = filterTasks(tasks, params);
  const result = paginate(filtered, params);
  if (params.facets) result.facets = buildTaskFacets(tasks);
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
  const existing = await dbGetOpportunity(id);
  if (!existing) return null;

  await sql`
    UPDATE agro.opportunities SET
      stage = ${patch.stage ?? existing.stage},
      priority = ${patch.priority ?? existing.priority},
      next_contact = ${patch.nextContact !== undefined ? patch.nextContact : existing.nextContact},
      updated_at = now()
    WHERE id = ${id}
  `;
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
  const existing = await dbGetMatter(id);
  if (!existing) return null;

  await sql`
    UPDATE agro.matters SET
      status = ${patch.status ?? existing.status},
      risk = ${patch.risk ?? existing.risk},
      cnj_number = ${patch.cnjNumber !== undefined ? patch.cnjNumber : (existing.cnjNumber ?? null)},
      court = ${patch.court !== undefined ? patch.court : (existing.court ?? null)},
      phase = ${patch.phase !== undefined ? patch.phase : (existing.phase ?? null)},
      opposing_party = ${patch.opposingParty !== undefined ? patch.opposingParty : (existing.opposingParty ?? null)},
      claim_value_brl = ${patch.claimValueBrl !== undefined ? patch.claimValueBrl : (existing.claimValueBrl ?? null)},
      opportunity_id = ${patch.opportunityId !== undefined ? patch.opportunityId : (existing.opportunityId ?? null)},
      next_steps = ${patch.nextSteps !== undefined ? patch.nextSteps : (existing.nextSteps ?? null)},
      updated_at = now()
    WHERE id = ${id}
  `;
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
  const id =
    input.id ??
    `DL-${String((await sql`SELECT COUNT(*)::int AS c FROM agro.deadlines`)[0].c + 501).padStart(3, "0")}`;
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
  const existing = await sql`SELECT * FROM agro.deadlines WHERE id = ${id}`;
  if (!existing.length) return null;
  const current = mapDeadline(existing[0] as Record<string, unknown>);

  const rows = await sql`
    UPDATE agro.deadlines SET
      status = ${patch.status ?? current.status},
      due_date = ${patch.dueDate ?? current.dueDate},
      completed_at = ${patch.completedAt !== undefined ? patch.completedAt : current.completedAt},
      owner = ${patch.owner ?? current.owner},
      notes = ${patch.notes !== undefined ? patch.notes : (current.notes ?? null)},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
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
    `;
  } else if (entityId) {
    rows = await sql`
      SELECT * FROM agro.activities WHERE entity_id = ${entityId}
      ORDER BY date DESC, created_at DESC
    `;
  } else {
    rows = await sql`SELECT * FROM agro.activities ORDER BY date DESC, created_at DESC`;
  }
  return rows.map((r) => mapActivity(r as Record<string, unknown>));
}

export async function dbCreateActivity(
  input: Omit<Activity, "id" | "createdAt"> & { id?: string },
): Promise<Activity> {
  const sql = getSql();
  const id =
    input.id ??
    `ACT-${String((await sql`SELECT COUNT(*)::int AS c FROM agro.activities`)[0].c + 601).padStart(3, "0")}`;
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
  await sql`
    INSERT INTO agro.opportunities (
      id, title, account_id, account_name, stage, value_brl, owner,
      expected_close, next_contact, priority, practice, lead_id
    )
    VALUES (
      ${opportunity.id}, ${opportunity.title}, ${opportunity.accountId ?? null},
      ${opportunity.accountName}, ${opportunity.stage}, ${opportunity.valueBrl},
      ${opportunity.owner}, ${opportunity.expectedClose}, ${opportunity.nextContact},
      ${opportunity.priority}, ${opportunity.practice}, ${lead.id}
    )
  `;
  await sql`
    UPDATE agro.leads SET
      status = 'qualificado',
      converted_opportunity_id = ${opportunity.id},
      updated_at = now()
    WHERE id = ${lead.id}
  `;
  const created = await dbGetOpportunity(opportunity.id);
  if (!created) throw new Error("Falha ao converter lead");
  return created;
}

export async function dbNextOpportunityId(): Promise<string> {
  const sql = getSql();
  const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM agro.opportunities`;
  return `OP-${String(Number(c) + 201).padStart(3, "0")}`;
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
  const [leads, accounts, opportunities, matters, tasks, deadlines, activities] =
    await Promise.all([
      dbListLeads({ pageSize: 10_000 }),
      dbListAccounts({ pageSize: 10_000 }),
      dbListOpportunities({ pageSize: 10_000 }),
      dbListMatters({ pageSize: 10_000 }),
      dbListTasks({ pageSize: 10_000 }),
      dbListDeadlines(),
      dbListActivities(),
    ]);
  return {
    leads: leads.items,
    accounts: accounts.items,
    opportunities: opportunities.items,
    matters: matters.items,
    tasks: tasks.items,
    deadlines,
    activities,
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
