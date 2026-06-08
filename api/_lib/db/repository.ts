import type {
  Account,
  Lead,
  Matter,
  Opportunity,
  Task,
  TaskStatus,
} from "../../../shared/agro/types";
import { getSql } from "./client";
import {
  mapAccount,
  mapLead,
  mapMatter,
  mapOpportunity,
  mapTask,
} from "./mappers";

export async function dbListLeads(): Promise<Lead[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.leads ORDER BY created_at DESC`;
  return rows.map((r) => mapLead(r as Record<string, unknown>));
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
    INSERT INTO agro.leads (id, name, contact, region, crop, source, status, owner, account_id, next_contact, notes, created_at)
    VALUES (
      ${id}, ${input.name}, ${input.contact}, ${input.region}, ${input.crop},
      ${input.source}, ${input.status}, ${input.owner}, ${input.accountId ?? null},
      ${input.nextContact}, ${input.notes}, ${input.createdAt}
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

export async function dbListAccounts(): Promise<Account[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT a.*,
      (SELECT COUNT(*)::int FROM agro.matters m
        WHERE m.account_id = a.id AND m.status != 'concluida') AS active_matters,
      (SELECT COUNT(*)::int FROM agro.opportunities o
        WHERE o.account_id = a.id AND o.stage NOT IN ('perdido', 'contrato')) AS active_opportunities
    FROM agro.accounts a
    ORDER BY a.name
  `;
  return rows.map((r) => mapAccount(r as Record<string, unknown>));
}

export async function dbGetAccount(id: string): Promise<Account | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT a.*,
      (SELECT COUNT(*)::int FROM agro.matters m
        WHERE m.account_id = a.id AND m.status != 'concluida') AS active_matters,
      (SELECT COUNT(*)::int FROM agro.opportunities o
        WHERE o.account_id = a.id AND o.stage NOT IN ('perdido', 'contrato')) AS active_opportunities
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

  const allTasks = await dbListTasks();
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

export async function dbListOpportunities(): Promise<Opportunity[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.opportunities ORDER BY expected_close`;
  return rows.map((r) => mapOpportunity(r as Record<string, unknown>));
}

export async function dbGetOpportunity(id: string): Promise<Opportunity | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.opportunities WHERE id = ${id}`;
  if (!rows.length) return null;
  return mapOpportunity(rows[0] as Record<string, unknown>);
}

export async function dbListMatters(): Promise<Matter[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.matters ORDER BY deadline`;
  return rows.map((r) => mapMatter(r as Record<string, unknown>));
}

export async function dbGetMatter(id: string): Promise<Matter | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.matters WHERE id = ${id}`;
  if (!rows.length) return null;
  return mapMatter(rows[0] as Record<string, unknown>);
}

export async function dbListTasks(): Promise<Task[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM agro.tasks ORDER BY due_date`;
  return rows.map((r) => mapTask(r as Record<string, unknown>));
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

export async function dbUpdateMatter(
  id: string,
  patch: Partial<Pick<Matter, "status" | "risk">>,
): Promise<Matter | null> {
  const sql = getSql();
  const existing = await dbGetMatter(id);
  if (!existing) return null;

  await sql`
    UPDATE agro.matters SET
      status = ${patch.status ?? existing.status},
      risk = ${patch.risk ?? existing.risk},
      updated_at = now()
    WHERE id = ${id}
  `;
  return dbGetMatter(id);
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

export type CrmDataset = {
  leads: Lead[];
  accounts: Account[];
  opportunities: Opportunity[];
  matters: Matter[];
  tasks: Task[];
};

export async function dbLoadAll(): Promise<CrmDataset> {
  const [leads, accounts, opportunities, matters, tasks] = await Promise.all([
    dbListLeads(),
    dbListAccounts(),
    dbListOpportunities(),
    dbListMatters(),
    dbListTasks(),
  ]);
  return { leads, accounts, opportunities, matters, tasks };
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
      INSERT INTO agro.accounts (id, name, type, region, area_ha, main_crop, owner, since)
      VALUES (${a.id}, ${a.name}, ${a.type}, ${a.region}, ${a.areaHa}, ${a.mainCrop}, ${a.owner}, ${a.since})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, type = EXCLUDED.type, region = EXCLUDED.region,
        area_ha = EXCLUDED.area_ha, main_crop = EXCLUDED.main_crop,
        owner = EXCLUDED.owner, since = EXCLUDED.since, updated_at = now()
    `;
  }

  for (const l of data.leads) {
    await sql`
      INSERT INTO agro.leads (id, name, contact, region, crop, source, status, owner, account_id, next_contact, notes, created_at)
      VALUES (${l.id}, ${l.name}, ${l.contact}, ${l.region}, ${l.crop}, ${l.source}, ${l.status}, ${l.owner}, ${l.accountId ?? null}, ${l.nextContact}, ${l.notes}, ${l.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, status = EXCLUDED.status, owner = EXCLUDED.owner,
        next_contact = EXCLUDED.next_contact, notes = EXCLUDED.notes, updated_at = now()
    `;
  }

  for (const o of data.opportunities) {
    await sql`
      INSERT INTO agro.opportunities (id, title, account_id, account_name, stage, value_brl, owner, expected_close, next_contact, priority, practice)
      VALUES (${o.id}, ${o.title}, ${o.accountId ?? null}, ${o.accountName}, ${o.stage}, ${o.valueBrl}, ${o.owner}, ${o.expectedClose}, ${o.nextContact}, ${o.priority}, ${o.practice})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, stage = EXCLUDED.stage, value_brl = EXCLUDED.value_brl,
        next_contact = EXCLUDED.next_contact, priority = EXCLUDED.priority, updated_at = now()
    `;
  }

  for (const m of data.matters) {
    await sql`
      INSERT INTO agro.matters (id, title, account_id, account_name, practice, status, risk, deadline, owner, description)
      VALUES (${m.id}, ${m.title}, ${m.accountId ?? null}, ${m.accountName}, ${m.practice}, ${m.status}, ${m.risk}, ${m.deadline}, ${m.owner}, ${m.description})
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, risk = EXCLUDED.risk, deadline = EXCLUDED.deadline, updated_at = now()
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
}

