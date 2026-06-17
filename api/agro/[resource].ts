import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  convertLead,
  createLead,
  getLead,
  listLeads,
  updateLead,
  getAccount,
  getAccountTimeline,
  listAccounts,
  getOpportunity,
  listOpportunities,
  updateOpportunity,
  getMatter,
  getMattersByOpportunity,
  listMatters,
  updateMatter,
  getRelatedTasks,
  getTask,
  listTasks,
  listDeadlines,
  createDeadline,
  updateDeadline,
  listActivities,
  createActivity,
  loadCrmDataset,
} from "../_lib/data-service.js";
import { computeCrmStats } from "../../shared/agro/stats.js";
import { resolveCopilotQuery } from "../../shared/agro/copilot.js";
import { getKnowledgePayload } from "../../shared/agro/knowledge.js";
import {
  parseLeadListQuery,
  parseAccountListQuery,
  parseOpportunityListQuery,
  parseMatterListQuery,
  parseTaskListQuery,
} from "../_lib/list-query.js";
import { json, methodNotAllowed, requireAuth, requireCsrf } from "../_lib/http.js";
import { checkUserRateLimit, getRateLimitHeaders } from "../_lib/rate-limit.js";
import {
  getBody,
  parseLeadConversion,
  parseLeadCreate,
  parseLeadPatch,
  parseOpportunityPatch,
  parseOpportunityCreate,
  parseMatterPatch,
  parseMatterCreate,
  parseTaskCreate,
  parseTaskPatch,
  parseDeadlineCreate,
  parseDeadlinePatch,
  parseActivityCreate,
  parseAccountCreate,
  parseAccountPatch,
  isActivityEntityType,
} from "../_lib/validation.js";
import { auditCreate, auditUpdate, auditDelete, type AuditEntityType } from "../_lib/audit.js";

/**
 * API consolidada — todas as rotas /api/agro/* em uma só Serverless Function
 * para respeitar o limite de 12 functions do plano Hobby da Vercel.
 *
 * Rotas:
 * /api/agro/leads?...         (leads, lead by id, convert lead, export csv)
 * /api/agro/accounts?...      (accounts, account by id, timeline, export csv)
 * /api/agro/opportunities?... (opportunities, opportunity by id, export csv)
 * /api/agro/matters?...       (matters, matter by id, by opportunity, export csv)
 * /api/agro/tasks?...         (tasks, task by id, related tasks, export csv)
 * /api/agro/deadlines?...     (deadlines)
 * /api/agro/activities?...    (activities)
 * /api/agro/stats             (CRM stats)
 * /api/agro/copilot           (copilot query)
 * /api/agro/knowledge         (knowledge base)
 */

function getResource(req: VercelRequest): string | undefined {
  // Vercel captura o path param "resource" da rota /api/agro/[resource].ts
  const raw = req.query.resource as string | undefined;
  if (!raw) return undefined;
  // Remove query string se houver
  const clean = raw.split("?")[0].toLowerCase();
  return clean || undefined;
}

// ── CSV helpers ────────────────────────────────────────────────────

function toCsvValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => toCsvValue(row[h])).join(",")),
  ];
  return lines.join("\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resource = getResource(req);

  if (!resource) {
    return json(res, { error: "Recurso não especificado" }, 400);
  }

  // ── CORS headers ──────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // ── CSRF validation for write requests ────────────────────────────
  if (!requireCsrf(req, res)) return;

  // ── Leads ──────────────────────────────────────────────────────────
  if (resource === "leads") {
    const user = requireAuth(req, res, "leads");
    if (!user) return;
    const isWrite = req.method === "POST" || req.method === "PATCH" || req.method === "DELETE";
    const rl = await checkUserRateLimit(user.id, isWrite ? "write" : "default");
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) {
      return json(res, { error: "Rate limit excedido" }, 429);
    }

    if (req.method === "GET") {
      const id = req.query.id as string | undefined;
      if (id) {
        const lead = await getLead(id);
        if (!lead) return json(res, { error: "Lead não encontrado" }, 404);
        return json(res, lead);
      }

      // CSV export
      if (req.query.export === "csv") {
        const result = await listLeads(parseLeadListQuery(req));
        const csv = arrayToCsv(result.items.map((l) => ({
          id: l.id,
          name: l.name,
          contact: l.contact,
          region: l.region,
          crop: l.crop,
          status: l.status,
          priority: l.priority,
          source: l.source,
          owner: l.owner,
          createdAt: l.createdAt,
          nextContact: l.nextContact,
        })));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csv);
      }

      return json(res, await listLeads(parseLeadListQuery(req)));
    }

    if (req.method === "POST") {
      const body = getBody(req.body);

      if (req.query.action === "convert" || body.action === "convert") {
        const id = (req.query.id as string | undefined) ?? body.id;
        if (!id) return json(res, { error: "id é obrigatório" }, 400);
        const input = parseLeadConversion(body);
        if (!input.ok) return json(res, { error: input.error }, 400);
        const result = await convertLead(String(id), input.data);
        if (!result.ok) {
          const status = result.reason === "not_found" ? 404 : 409;
          const message =
            result.reason === "not_found"
              ? "Lead não encontrado"
              : result.reason === "already_converted"
                ? "Lead já convertido em oportunidade"
                : "Lead descartado não pode ser convertido";
          return json(res, { error: message, reason: result.reason }, status);
        }
        auditCreate(
          { userId: user.id, userName: user.name, userRole: user.role },
          "lead" as AuditEntityType,
          result.opportunity as unknown as Record<string, unknown>,
        );
        return json(res, result, 201);
      }

      const input = parseLeadCreate(body);
      if (!input.ok) return json(res, { error: input.error }, 400);
      const lead = await createLead(input.data);
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "lead" as AuditEntityType,
        lead as unknown as Record<string, unknown>,
      );
      return json(res, lead, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const patch = parseLeadPatch(getBody(req.body));
      if (!patch.ok) return json(res, { error: patch.error }, 400);
      const before = await getLead(id);
      if (!before) return json(res, { error: "Lead não encontrado" }, 404);
      const lead = await updateLead(id, patch.data);
      if (!lead) return json(res, { error: "Lead não encontrado" }, 404);
      auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "lead" as AuditEntityType,
        id,
        lead.name,
        before as unknown as Record<string, unknown>,
        lead as unknown as Record<string, unknown>,
      );
      return json(res, lead);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const lead = await getLead(id);
      if (!lead) return json(res, { error: "Lead não encontrado" }, 404);
      const { deleteLead } = await import("../_lib/data-service.js");
      await deleteLead(id);
      auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "lead" as AuditEntityType,
        lead as unknown as Record<string, unknown>,
      );
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Accounts ───────────────────────────────────────────────────────
  if (resource === "accounts") {
    const user = requireAuth(req, res, "accounts");
    if (!user) return;
    const isWrite = req.method === "POST" || req.method === "PATCH" || req.method === "DELETE";
    const rl = await checkUserRateLimit(user.id, isWrite ? "write" : "default");
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) {
      return json(res, { error: "Rate limit excedido" }, 429);
    }

    if (req.method === "GET") {
      const id = req.query.id as string | undefined;
      if (id) {
        const account = await getAccount(id);
        if (!account) return json(res, { error: "Conta não encontrada" }, 404);
        if (req.query.timeline === "1") {
          return json(res, {
            account,
            timeline: await getAccountTimeline(id),
          });
        }
        return json(res, account);
      }

      // CSV export
      if (req.query.export === "csv") {
        const result = await listAccounts(parseAccountListQuery(req));
        const csv = arrayToCsv(result.items.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          region: a.region,
          mainCrop: a.mainCrop,
          owner: a.owner,
          areaHa: a.areaHa,
          activeMatters: a.activeMatters,
          activeOpportunities: a.activeOpportunities,
          since: a.since,
        })));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="contas-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csv);
      }

      return json(res, await listAccounts(parseAccountListQuery(req)));
    }

    if (req.method === "POST") {
      const body = getBody(req.body);
      const input = parseAccountCreate(body);
      if (!input.ok) return json(res, { error: input.error }, 400);
      const { createAccount } = await import("../_lib/data-service.js");
      const account = await createAccount(input.data as Parameters<typeof createAccount>[0]);
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "account" as AuditEntityType,
        account as unknown as Record<string, unknown>,
      );
      return json(res, account, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const body = getBody(req.body);
      const input = parseAccountPatch(body);
      if (!input.ok) return json(res, { error: input.error }, 400);
      const before = await getAccount(id);
      if (!before) return json(res, { error: "Conta não encontrada" }, 404);
      const { updateAccount } = await import("../_lib/data-service.js");
      const account = await updateAccount(id, input.data as Record<string, unknown>);
      if (!account) return json(res, { error: "Conta não encontrada" }, 404);
      auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "account" as AuditEntityType,
        id,
        account.name,
        before as unknown as Record<string, unknown>,
        account as unknown as Record<string, unknown>,
      );
      return json(res, account);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const account = await getAccount(id);
      if (!account) return json(res, { error: "Conta não encontrada" }, 404);
      const { deleteAccount } = await import("../_lib/data-service.js");
      await deleteAccount(id);
      auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
          "account" as AuditEntityType,
          account as unknown as Record<string, unknown>,
        );
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Opportunities ──────────────────────────────────────────────────
  if (resource === "opportunities") {
    const user = requireAuth(req, res, "opportunities");
    if (!user) return;
    const isWrite = req.method === "POST" || req.method === "PATCH" || req.method === "DELETE";
    const rl = await checkUserRateLimit(user.id, isWrite ? "write" : "default");
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) {
      return json(res, { error: "Rate limit excedido" }, 429);
    }

    if (req.method === "GET") {
      const id = req.query.id as string | undefined;
      if (id) {
        const opp = await getOpportunity(id);
        if (!opp) return json(res, { error: "Oportunidade não encontrada" }, 404);
        return json(res, opp);
      }

      // CSV export
      if (req.query.export === "csv") {
        const result = await listOpportunities(parseOpportunityListQuery(req));
        const csv = arrayToCsv(result.items.map((o) => ({
          id: o.id,
          title: o.title,
          accountName: o.accountName,
          stage: o.stage,
          priority: o.priority,
          valueBrl: o.valueBrl,
          owner: o.owner,
          practice: o.practice,
          expectedClose: o.expectedClose,
          nextContact: o.nextContact,
        })));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="oportunidades-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csv);
      }

      return json(res, await listOpportunities(parseOpportunityListQuery(req)));
    }

    if (req.method === "POST") {
      const body = getBody(req.body);
      const input = parseOpportunityCreate(body);
      if (!input.ok) return json(res, { error: input.error }, 400);
      const { createOpportunity } = await import("../_lib/data-service.js");
      const opp = await createOpportunity(input.data as Parameters<typeof createOpportunity>[0]);
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "opportunity" as AuditEntityType,
        opp as unknown as Record<string, unknown>,
      );
      return json(res, opp, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const patch = parseOpportunityPatch(getBody(req.body));
      if (!patch.ok) return json(res, { error: patch.error }, 400);
      const before = await getOpportunity(id);
      if (!before) return json(res, { error: "Oportunidade não encontrada" }, 404);
      const opp = await updateOpportunity(id, patch.data);
      if (!opp) return json(res, { error: "Oportunidade não encontrada" }, 404);
      auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "opportunity" as AuditEntityType,
        id,
        opp.title,
        before as unknown as Record<string, unknown>,
        opp as unknown as Record<string, unknown>,
      );
      return json(res, opp);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const opp = await getOpportunity(id);
      if (!opp) return json(res, { error: "Oportunidade não encontrada" }, 404);
      const { deleteOpportunity } = await import("../_lib/data-service.js");
      await deleteOpportunity(id);
      auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "opportunity" as AuditEntityType,
        opp as unknown as Record<string, unknown>,
      );
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Matters ────────────────────────────────────────────────────────
  if (resource === "matters") {
    const user = requireAuth(req, res, "matters");
    if (!user) return;
    const isWrite = req.method === "POST" || req.method === "PATCH" || req.method === "DELETE";
    const rl = await checkUserRateLimit(user.id, isWrite ? "write" : "default");
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) {
      return json(res, { error: "Rate limit excedido" }, 429);
    }

    if (req.method === "GET") {
      const id = req.query.id as string | undefined;
      if (id) {
        const matter = await getMatter(id);
        if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
        return json(res, matter);
      }
      const opportunityId = req.query.opportunityId as string | undefined;
      if (opportunityId) {
        return json(res, await getMattersByOpportunity(opportunityId));
      }

      // CSV export
      if (req.query.export === "csv") {
        const result = await listMatters(parseMatterListQuery(req));
        const csv = arrayToCsv(result.items.map((m) => ({
          id: m.id,
          title: m.title,
          accountName: m.accountName,
          status: m.status,
          risk: m.risk,
          cnjNumber: m.cnjNumber,
          court: m.court,
          opposingParty: m.opposingParty,
          claimValueBrl: m.claimValueBrl,
          owner: m.owner,
          deadline: m.deadline,
        })));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="demandas-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csv);
      }

      return json(res, await listMatters(parseMatterListQuery(req)));
    }

    if (req.method === "POST") {
      const body = getBody(req.body);
      const input = parseMatterCreate(body);
      if (!input.ok) return json(res, { error: input.error }, 400);
      const { createMatter } = await import("../_lib/data-service.js");
      const matter = await createMatter(input.data as Parameters<typeof createMatter>[0]);
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "matter" as AuditEntityType,
        matter as unknown as Record<string, unknown>,
      );
      return json(res, matter, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const patch = parseMatterPatch(getBody(req.body));
      if (!patch.ok) return json(res, { error: patch.error }, 400);
      const before = await getMatter(id);
      if (!before) return json(res, { error: "Demanda não encontrada" }, 404);
      const matter = await updateMatter(id, patch.data);
      if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
      auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "matter" as AuditEntityType,
        id,
        matter.title,
        before as unknown as Record<string, unknown>,
        matter as unknown as Record<string, unknown>,
      );
      return json(res, matter);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const matter = await getMatter(id);
      if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
      const { deleteMatter } = await import("../_lib/data-service.js");
      await deleteMatter(id);
      auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "matter" as AuditEntityType,
        matter as unknown as Record<string, unknown>,
      );
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Tasks ──────────────────────────────────────────────────────────
  if (resource === "tasks") {
    const user = requireAuth(req, res, "tasks");
    if (!user) return;
    const isWrite = req.method === "POST" || req.method === "PATCH" || req.method === "DELETE";
    const rl = await checkUserRateLimit(user.id, isWrite ? "write" : "default");
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) {
      return json(res, { error: "Rate limit excedido" }, 429);
    }

    if (req.method === "GET") {
      const id = req.query.id as string | undefined;
      const relatedTo = req.query.relatedTo as string | undefined;

      if (relatedTo) return json(res, await getRelatedTasks(relatedTo));

      if (id) {
        const task = await getTask(id);
        if (!task) return json(res, { error: "Tarefa não encontrada" }, 404);
        return json(res, task);
      }

      // CSV export
      if (req.query.export === "csv") {
        const result = await listTasks(parseTaskListQuery(req));
        const csv = arrayToCsv(result.items.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          owner: t.owner,
          dueDate: t.dueDate,
          relatedTo: t.relatedTo,
          type: t.type,
        })));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="tarefas-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csv);
      }

      return json(res, await listTasks(parseTaskListQuery(req)));
    }

    if (req.method === "POST") {
      const body = getBody(req.body);
      const input = parseTaskCreate(body);
      if (!input.ok) return json(res, { error: input.error }, 400);
      const { createTask } = await import("../_lib/data-service.js");
      const task = await createTask(input.data as Parameters<typeof createTask>[0]);
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "task" as AuditEntityType,
        task as unknown as Record<string, unknown>,
      );
      return json(res, task, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const body = getBody(req.body);
      const input = parseTaskPatch(body);
      if (!input.ok) return json(res, { error: input.error }, 400);
      const before = await getTask(id);
      if (!before) return json(res, { error: "Tarefa não encontrada" }, 404);
      const { updateTask } = await import("../_lib/data-service.js");
      const task = await updateTask(id, input.data as Record<string, unknown>);
      if (!task) return json(res, { error: "Tarefa não encontrada" }, 404);
      auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "task" as AuditEntityType,
        id,
        task.title,
        before as unknown as Record<string, unknown>,
        task as unknown as Record<string, unknown>,
      );
      return json(res, task);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const task = await getTask(id);
      if (!task) return json(res, { error: "Tarefa não encontrada" }, 404);
      const { deleteTask } = await import("../_lib/data-service.js");
      await deleteTask(id);
      auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "task" as AuditEntityType,
        task as unknown as Record<string, unknown>,
      );
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Deadlines ──────────────────────────────────────────────────────
  if (resource === "deadlines") {
    const user = requireAuth(req, res, "deadlines");
    if (!user) return;
    const isWrite = req.method === "POST" || req.method === "PATCH" || req.method === "DELETE";
    const rl = await checkUserRateLimit(user.id, isWrite ? "write" : "default");
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) {
      return json(res, { error: "Rate limit excedido" }, 429);
    }

    if (req.method === "GET") {
      const matterId = req.query.matterId as string | undefined;
      return json(res, await listDeadlines(matterId));
    }

    if (req.method === "POST") {
      const input = parseDeadlineCreate(getBody(req.body));
      if (!input.ok) return json(res, { error: input.error }, 400);
      const matter = await getMatter(input.data.matterId);
      if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
      const deadline = await createDeadline(input.data);
      return json(res, deadline, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const patch = parseDeadlinePatch(getBody(req.body));
      if (!patch.ok) return json(res, { error: patch.error }, 400);
      const deadline = await updateDeadline(id, patch.data);
      if (!deadline) return json(res, { error: "Prazo não encontrado" }, 404);
      return json(res, deadline);
    }

    return methodNotAllowed(res);
  }

  // ── Activities ─────────────────────────────────────────────────────
  if (resource === "activities") {
    if (!requireAuth(req, res, "activities")) return;

    if (req.method === "GET") {
      const entityId = req.query.entityId as string | undefined;
      const rawEntityType = req.query.entityType;
      const entityType =
        typeof rawEntityType === "string" && isActivityEntityType(rawEntityType)
          ? rawEntityType
          : undefined;
      if (rawEntityType && !entityType) {
        return json(res, { error: "entityType inválido" }, 400);
      }
      return json(res, await listActivities(entityId, entityType));
    }

    if (req.method === "POST") {
      const input = parseActivityCreate(getBody(req.body));
      if (!input.ok) return json(res, { error: input.error }, 400);
      const activity = await createActivity(input.data);
      return json(res, activity, 201);
    }

    return methodNotAllowed(res);
  }

  // ── Stats ──────────────────────────────────────────────────────────
  if (resource === "stats") {
    if (!requireAuth(req, res, "stats")) return;

    if (req.method === "GET") {
      const dataset = await loadCrmDataset();
      return json(
        res,
        computeCrmStats({
          leads: dataset.leads,
          accounts: dataset.accounts,
          opportunities: dataset.opportunities,
          matters: dataset.matters,
          tasks: dataset.tasks,
        }),
      );
    }

    return methodNotAllowed(res);
  }

  // ── Copilot ────────────────────────────────────────────────────────
  if (resource === "copilot") {
    if (!requireAuth(req, res, "copilot")) return;

    if (req.method === "POST") {
      const body = (req.body ?? {}) as {
        query?: string;
        contextEntity?: import("../../shared/agro/types.js").CopilotContextEntity | null;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
      };
      if (!body.query?.trim()) {
        return json(res, { error: "query é obrigatório" }, 400);
      }

      const dataset = await loadCrmDataset();
      const stats = computeCrmStats({
        leads: dataset.leads,
        accounts: dataset.accounts,
        opportunities: dataset.opportunities,
        matters: dataset.matters,
        tasks: dataset.tasks,
      });

      const query = body.query.trim();
      const contextEntity = body.contextEntity ?? null;

      // Try LLM pipeline first; fall back to keyword engine
      try {
        const { getDefaultConfig, createProvider } = await import("../_lib/llm/providers.js");
        const llmConfig = getDefaultConfig();

        if (llmConfig) {
          // RAG: semantic search on KB
          const { searchKnowledge } = await import("../_lib/llm/rag.js");
          const ragResults = await searchKnowledge(query, 5);

          // Build prompt
          const { buildSystemPrompt, buildUserMessage } = await import("../_lib/llm/prompt.js");
          const systemPrompt = buildSystemPrompt({
            query,
            contextEntity,
            stats,
            ragResults,
            history: body.history,
          });
          const userMessage = buildUserMessage(query, body.history);

          // Generate structured output with AI SDK v6
          const { generateText, Output } = await import("ai");
          const { CopilotResponseSchema } = await import("../_lib/llm/schema.js");

          const modelFactory = createProvider(llmConfig.provider);

          const { output: llmOutput } = await generateText({
            model: modelFactory(llmConfig.model),
            system: systemPrompt,
            prompt: userMessage,
            output: Output.object({ schema: CopilotResponseSchema }),
            temperature: llmConfig.temperature ?? 0.3,
          });

          if (!llmOutput) {
            throw new Error("LLM returned no output");
          }

          // Resolve KB sources from sourceIds
          const { getKnowledgeDocument, getKnowledgeCategory } = await import("../../shared/agro/knowledge.js");
          const sources = llmOutput.sourceIds
            .map((id: string) => {
              const doc = getKnowledgeDocument(id);
              if (!doc) return null;
              const cat = getKnowledgeCategory(doc.categoryId);
              return {
                id: `src-${id}`,
                documentId: id,
                title: doc.title,
                excerpt: doc.summary,
                categoryLabel: cat?.label ?? "",
              };
            })
            .filter(Boolean) as Array<{
            id: string;
            documentId: string;
            title: string;
            excerpt: string;
            categoryLabel: string;
          }>;

          // Resolve related CRM entities
          const relatedEntities: Array<{
            id: string;
            type: "conta" | "oportunidade" | "demanda" | "lead";
            name: string;
          }> = [];
          if (contextEntity) {
            relatedEntities.push({
              id: contextEntity.id,
              type: contextEntity.type,
              name: contextEntity.name,
            });
          }

          const response: import("../../shared/agro/types.js").CopilotResponse = {
            id: `cop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            promptId: null,
            query,
            synthesis: llmOutput.synthesis,
            risks: llmOutput.risks,
            nextSteps: llmOutput.nextSteps,
            sources,
            relatedEntities,
            simulated: false,
            disclaimer:
              "Esta análise é gerada por IA e tem caráter informativo. Não substitui consulta a um advogado especializado.",
            generatedAt: new Date().toISOString(),
          };

          return json(res, response);
        }
      } catch (err) {
        console.error("[Copilot] LLM pipeline failed, falling back to keywords:", err);
      }

      // Fallback: keyword engine
      const response = resolveCopilotQuery(
        { query, contextEntity },
        stats,
      );

      return json(res, response);
    }

    return methodNotAllowed(res);
  }

  // ── Knowledge ──────────────────────────────────────────────────────
  if (resource === "knowledge") {
    if (!requireAuth(req, res, "knowledge")) return;

    if (req.method === "GET") {
      const categoryId =
        typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
      return json(res, getKnowledgePayload(categoryId));
    }

    return methodNotAllowed(res);
  }

  // ── Audit Logs ─────────────────────────────────────────────────────
  if (resource === "audit") {
    if (!requireAuth(req, res, "audit")) return;

    if (req.method === "GET") {
      const {
        queryAuditLogs,
        exportAuditLogsCsv,
        getAuditStats,
      } = await import("../_lib/audit.js");

      const action = typeof req.query.action === "string" ? req.query.action : "list";

      if (action === "stats") {
        return json(res, getAuditStats());
      }

      if (action === "export") {
        const filters = {
          entityType: typeof req.query.entityType === "string" ? req.query.entityType as import("../_lib/audit.js").AuditEntityType : undefined,
          entityId: typeof req.query.entityId === "string" ? req.query.entityId : undefined,
          userId: typeof req.query.userId === "string" ? req.query.userId : undefined,
          action: typeof req.query.action === "string" && req.query.action !== "export" ? req.query.action as import("../_lib/audit.js").AuditAction : undefined,
          from: typeof req.query.from === "string" ? req.query.from : undefined,
          to: typeof req.query.to === "string" ? req.query.to : undefined,
          limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
        };
        const { logs } = queryAuditLogs(filters);
        const csv = exportAuditLogsCsv(logs);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csv);
      }

      // Default: list with filters
      const filters = {
        entityType: typeof req.query.entityType === "string" ? req.query.entityType as import("../_lib/audit.js").AuditEntityType : undefined,
        entityId: typeof req.query.entityId === "string" ? req.query.entityId : undefined,
        userId: typeof req.query.userId === "string" ? req.query.userId : undefined,
        action: typeof req.query.action === "string" ? req.query.action as import("../_lib/audit.js").AuditAction : undefined,
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
        limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
        offset: typeof req.query.offset === "string" ? Number(req.query.offset) : undefined,
      };
      const { logs, total } = queryAuditLogs(filters);
      return json(res, { items: logs, total, limit: filters.limit ?? 50, offset: filters.offset ?? 0 });
    }

    return methodNotAllowed(res);
  }

  // ── Email ──────────────────────────────────────────────────────────
  if (resource === "email") {
    if (!requireAuth(req, res, "email")) return;

    const { sendEmail, fetchEmails, getEmailFolders, getEmailStatus } =
      await import("../_lib/email.js");

    if (req.method === "GET") {
      const action = typeof req.query.action === "string" ? req.query.action : "status";

      if (action === "status") {
        return json(res, getEmailStatus());
      }

      if (action === "folders") {
        return json(res, { folders: await getEmailFolders() });
      }

      if (action === "list") {
        const folder = typeof req.query.folder === "string" ? req.query.folder : undefined;
        const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
        const since = typeof req.query.since === "string" ? req.query.since : undefined;
        return json(res, { emails: await fetchEmails({ folder, limit, since }) });
      }
    }

    if (req.method === "POST") {
      const body = (req.body ?? {}) as {
        to?: string | string[];
        subject?: string;
        text?: string;
        html?: string;
        cc?: string[];
        bcc?: string[];
      };

      if (!body.to || !body.subject || !body.text) {
        return json(res, { error: "to, subject e text são obrigatórios" }, 400);
      }

      const result = await sendEmail({
        to: body.to,
        subject: body.subject,
        text: body.text,
        html: body.html,
        cc: body.cc,
        bcc: body.bcc,
      });
      return json(res, result);
    }

    return methodNotAllowed(res);
  }

  // ── CNPJ/CPF Lookup ───────────────────────────────────────────────
  if (resource === "lookup") {
    if (!requireAuth(req, res, "leads")) return;

    if (req.method === "GET") {
      const type = typeof req.query.type === "string" ? req.query.type : "";
      const document = typeof req.query.document === "string" ? req.query.document : "";

      if (!type || !document) {
        return json(res, { error: "type e document são obrigatórios" }, 400);
      }

      if (type === "cnpj") {
        const { lookupCnpj, isValidCnpj, formatCnpj } = await import("../_lib/cnpj.js");
        if (!isValidCnpj(document)) {
          return json(res, { error: "CNPJ inválido" }, 400);
        }
        const data = await lookupCnpj(document);
        if (!data) {
          return json(res, { error: "CNPJ não encontrado" }, 404);
        }
        return json(res, { ...data, formattedCnpj: formatCnpj(data.cnpj) });
      }

      if (type === "cpf") {
        const { lookupCpf, isValidCpf, formatCpf } = await import("../_lib/cnpj.js");
        if (!isValidCpf(document)) {
          return json(res, { error: "CPF inválido" }, 400);
        }
        const data = await lookupCpf(document);
        if (!data) {
          return json(res, { error: "CPF não encontrado" }, 404);
        }
        return json(res, { ...data, formattedCpf: formatCpf(data.cpf) });
      }

      return json(res, { error: "type deve ser 'cnpj' ou 'cpf'" }, 400);
    }

    return methodNotAllowed(res);
  }

  // ── Documents ─────────────────────────────────────────────────────
  if (resource === "documents") {
    const user = requireAuth(req, res, "leads");
    if (!user) return;
    if (!requireCsrf(req, res)) return;

    if (req.method === "GET") {
      const { listDocuments } = await import("../../shared/agro/store.js");
      const docs = listDocuments({
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        matterId: req.query.matterId as string,
      });
      return json(res, docs);
    }

    if (req.method === "POST") {
      const body = getBody(req.body) as Record<string, unknown>;
      const { addDocument } = await import("../../shared/agro/store.js");
      const now = new Date().toISOString();
      const doc = await addDocument({
        id: `DOC-${Date.now()}`,
        name: String(body.name || ""),
        category: (body.category as string || "outro") as any,
        status: (body.status as string || "pendente") as any,
        entityType: (body.entityType as string || "matter") as any,
        entityId: String(body.entityId || ""),
        matterId: body.matterId as string || null,
        description: body.description as string,
        fileName: body.fileName as string,
        fileSize: body.fileSize as number,
        mimeType: body.mimeType as string,
        version: 1,
        versions: [{
          version: 1,
          fileName: String(body.fileName || body.name || ""),
          uploadedBy: user.name,
          uploadedAt: now,
        }],
        tags: body.tags as string[],
        owner: user.name,
        dueDate: body.dueDate as string || null,
        createdAt: now,
        updatedAt: now,
      } as any);
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "lead" as AuditEntityType,
        doc as unknown as Record<string, unknown>,
      );
      return json(res, doc, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { getDocument, patchDocument } = await import("../../shared/agro/store.js");
      const before = getDocument(id);
      if (!before) return json(res, { error: "Documento não encontrado" }, 404);
      const patch = getBody(req.body) as Record<string, unknown>;
      const doc = patchDocument(id, patch as any);
      if (!doc) return json(res, { error: "Documento não encontrado" }, 404);
      auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "lead" as AuditEntityType,
        id,
        doc.name,
        before as unknown as Record<string, unknown>,
        doc as unknown as Record<string, unknown>,
      );
      return json(res, doc);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { getDocument, deleteDocument } = await import("../../shared/agro/store.js");
      const doc = getDocument(id);
      if (!doc) return json(res, { error: "Documento não encontrado" }, 404);
      await deleteDocument(id);
      auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "lead" as AuditEntityType,
        doc as unknown as Record<string, unknown>,
      );
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Document Checklist ────────────────────────────────────────────
  if (resource === "document-checklist") {
    const user = requireAuth(req, res, "leads");
    if (!user) return;

    if (req.method === "GET") {
      const matterId = req.query.matterId as string;
      if (!matterId) return json(res, { error: "matterId é obrigatório" }, 400);
      const { listDocumentChecklist } = await import("../../shared/agro/store.js");
      return json(res, listDocumentChecklist(matterId));
    }

    if (req.method === "POST") {
      const body = getBody(req.body) as Record<string, unknown>;
      const { addDocumentChecklistItem } = await import("../../shared/agro/store.js");
      const item = await addDocumentChecklistItem({
        id: `DCL-${Date.now()}`,
        matterId: String(body.matterId || ""),
        label: String(body.label || ""),
        category: (body.category as string || "outro") as any,
        required: Boolean(body.required),
        status: "pendente",
        documentId: null,
        notes: body.notes as string,
        createdAt: new Date().toISOString(),
      });
      return json(res, item, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { patchDocumentChecklistItem } = await import("../../shared/agro/store.js");
      const item = patchDocumentChecklistItem(id, getBody(req.body) as any);
      if (!item) return json(res, { error: "Item não encontrado" }, 404);
      return json(res, item);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { deleteDocumentChecklistItem } = await import("../../shared/agro/store.js");
      await deleteDocumentChecklistItem(id);
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Time Entries ──────────────────────────────────────────────────
  if (resource === "time-entries") {
    const user = requireAuth(req, res, "leads");
    if (!user) return;
    if (!requireCsrf(req, res)) return;

    if (req.method === "GET") {
      const { listTimeEntries } = await import("../../shared/agro/store.js");
      const entries = listTimeEntries({
        matterId: req.query.matterId as string,
        owner: req.query.owner as string,
        invoiced: req.query.invoiced === "true" ? true : req.query.invoiced === "false" ? false : undefined,
      });
      return json(res, entries);
    }

    if (req.method === "POST") {
      const body = getBody(req.body) as Record<string, unknown>;
      const { addTimeEntry } = await import("../../shared/agro/store.js");
      const hours = Number(body.hours) || 0;
      const hourlyRate = Number(body.hourlyRate) || 0;
      const entry = await addTimeEntry({
        id: `TE-${Date.now()}`,
        matterId: String(body.matterId || ""),
        taskId: body.taskId as string || null,
        description: String(body.description || ""),
        hours,
        hourlyRate,
        totalBrl: hours * hourlyRate,
        type: (body.type as string || "horas") as any,
        date: String(body.date || new Date().toISOString().slice(0, 10)),
        owner: user.name,
        billable: body.billable !== false,
        invoiced: false,
        createdAt: new Date().toISOString(),
      });
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "lead" as AuditEntityType,
        entry as unknown as Record<string, unknown>,
      );
      return json(res, entry, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { patchTimeEntry } = await import("../../shared/agro/store.js");
      const entry = patchTimeEntry(id, getBody(req.body) as any);
      if (!entry) return json(res, { error: "Registro não encontrado" }, 404);
      return json(res, entry);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { deleteTimeEntry } = await import("../../shared/agro/store.js");
      await deleteTimeEntry(id);
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Invoices ──────────────────────────────────────────────────────
  if (resource === "invoices") {
    const user = requireAuth(req, res, "leads");
    if (!user) return;
    if (!requireCsrf(req, res)) return;

    if (req.method === "GET") {
      const { listInvoices } = await import("../../shared/agro/store.js");
      return json(res, listInvoices({
        accountId: req.query.accountId as string,
        status: req.query.status as string,
      }));
    }

    if (req.method === "POST") {
      const body = getBody(req.body) as Record<string, unknown>;
      const { addInvoice } = await import("../../shared/agro/store.js");
      const invoice = await addInvoice({
        id: `INV-${Date.now()}`,
        accountId: String(body.accountId || ""),
        matterId: body.matterId as string || null,
        number: String(body.number || `FAT-${Date.now()}`),
        status: "rascunho",
        totalBrl: Number(body.totalBrl) || 0,
        issuedAt: new Date().toISOString(),
        dueAt: String(body.dueAt || ""),
        notes: body.notes as string,
        timeEntryIds: (body.timeEntryIds as string[]) || [],
        createdAt: new Date().toISOString(),
      });
      return json(res, invoice, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { patchInvoice } = await import("../../shared/agro/store.js");
      const invoice = patchInvoice(id, getBody(req.body) as any);
      if (!invoice) return json(res, { error: "Fatura não encontrada" }, 404);
      return json(res, invoice);
    }

    return methodNotAllowed(res);
  }

  // ── Fee Agreements ────────────────────────────────────────────────
  if (resource === "fee-agreements") {
    const user = requireAuth(req, res, "leads");
    if (!user) return;

    if (req.method === "GET") {
      const { listFeeAgreements } = await import("../../shared/agro/store.js");
      return json(res, listFeeAgreements({
        accountId: req.query.accountId as string,
        matterId: req.query.matterId as string,
      }));
    }

    if (req.method === "POST") {
      const body = getBody(req.body) as Record<string, unknown>;
      const { addFeeAgreement } = await import("../../shared/agro/store.js");
      const agreement = await addFeeAgreement({
        id: `FA-${Date.now()}`,
        accountId: String(body.accountId || ""),
        matterId: body.matterId as string || null,
        type: (body.type as string || "hora") as any,
        hourlyRate: body.hourlyRate as number,
        fixedValue: body.fixedValue as number,
        percentage: body.percentage as number,
        successFeePercentage: body.successFeePercentage as number,
        capValue: body.capValue as number,
        description: String(body.description || ""),
        signedAt: String(body.signedAt || new Date().toISOString()),
        expiresAt: body.expiresAt as string || null,
        active: true,
        createdAt: new Date().toISOString(),
      });
      return json(res, agreement, 201);
    }

    return methodNotAllowed(res);
  }

  // ── Contacts ──────────────────────────────────────────────────────
  if (resource === "contacts") {
    const user = requireAuth(req, res, "leads");
    if (!user) return;
    if (!requireCsrf(req, res)) return;

    if (req.method === "GET") {
      const { listContacts } = await import("../../shared/agro/store.js");
      return json(res, listContacts({ accountId: req.query.accountId as string }));
    }

    if (req.method === "POST") {
      const body = getBody(req.body) as Record<string, unknown>;
      const { addContact } = await import("../../shared/agro/store.js");
      const contact = await addContact({
        id: `CT-${Date.now()}`,
        name: String(body.name || ""),
        email: body.email as string,
        phone: body.phone as string,
        whatsapp: body.whatsapp as string,
        cpf: body.cpf as string,
        role: (body.role as string || "outro") as any,
        department: body.department as string,
        isPrimary: Boolean(body.isPrimary),
        accountIds: (body.accountIds as string[]) || [],
        notes: body.notes as string,
        owner: user.name,
        createdAt: new Date().toISOString(),
      });
      return json(res, contact, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { patchContact } = await import("../../shared/agro/store.js");
      const contact = patchContact(id, getBody(req.body) as any);
      if (!contact) return json(res, { error: "Contato não encontrado" }, 404);
      return json(res, contact);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { deleteContact } = await import("../../shared/agro/store.js");
      await deleteContact(id);
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Properties ────────────────────────────────────────────────────
  if (resource === "properties") {
    const user = requireAuth(req, res, "leads");
    if (!user) return;
    if (!requireCsrf(req, res)) return;

    if (req.method === "GET") {
      const { listProperties } = await import("../../shared/agro/store.js");
      return json(res, listProperties({ accountId: req.query.accountId as string }));
    }

    if (req.method === "POST") {
      const body = getBody(req.body) as Record<string, unknown>;
      const { addProperty } = await import("../../shared/agro/store.js");
      const property = await addProperty({
        id: `PR-${Date.now()}`,
        name: String(body.name || ""),
        type: (body.type as string || "propriedade") as any,
        accountId: String(body.accountId || ""),
        carNumber: body.carNumber as string,
        matricula: body.matricula as string,
        areaHa: Number(body.areaHa) || 0,
        declaredAreaHa: body.declaredAreaHa as number,
        carAreaHa: body.carAreaHa as number,
        matriculaAreaHa: body.matriculaAreaHa as number,
        location: body.location as string,
        municipality: body.municipality as string,
        state: body.state as string,
        GPS: body.GPS as string,
        mainCrop: body.mainCrop as string,
        encumbrances: body.encumbrances as string[],
        restrictions: body.restrictions as string[],
        notes: body.notes as string,
        owner: user.name,
        createdAt: new Date().toISOString(),
      });
      return json(res, property, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { patchProperty } = await import("../../shared/agro/store.js");
      const property = patchProperty(id, getBody(req.body) as any);
      if (!property) return json(res, { error: "Propriedade não encontrada" }, 404);
      return json(res, property);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { deleteProperty } = await import("../../shared/agro/store.js");
      await deleteProperty(id);
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Opposing Parties ──────────────────────────────────────────────
  if (resource === "opposing-parties") {
    const user = requireAuth(req, res, "leads");
    if (!user) return;

    if (req.method === "GET") {
      const { listOpposingParties } = await import("../../shared/agro/store.js");
      return json(res, listOpposingParties());
    }

    if (req.method === "POST") {
      const body = getBody(req.body) as Record<string, unknown>;
      const { addOpposingParty } = await import("../../shared/agro/store.js");
      const party = await addOpposingParty({
        id: `OPP-${Date.now()}`,
        name: String(body.name || ""),
        cpf: body.cpf as string,
        cnpj: body.cnpj as string,
        type: (body.type as string || "pessoa_fisica") as any,
        lawyer: body.lawyer as string,
        lawyerOab: body.lawyerOab as string,
        phone: body.phone as string,
        email: body.email as string,
        address: body.address as string,
        notes: body.notes as string,
        matters: (body.matters as string[]) || [],
        createdAt: new Date().toISOString(),
      });
      return json(res, party, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { patchOpposingParty } = await import("../../shared/agro/store.js");
      const party = patchOpposingParty(id, getBody(req.body) as any);
      if (!party) return json(res, { error: "Parte contrária não encontrada" }, 404);
      return json(res, party);
    }

    return methodNotAllowed(res);
  }

  // ── Conflict Check ────────────────────────────────────────────────
  if (resource === "conflict-check") {
    const user = requireAuth(req, res, "leads");
    if (!user) return;

    if (req.method === "GET") {
      const name = (req.query.name as string || "").toLowerCase();
      if (!name) return json(res, { error: "name é obrigatório" }, 400);

      const { listOpposingParties, listMatters, listLeads } = await import("../../shared/agro/store.js");
      const conflicts: Array<{ type: string; entity: string; detail: string }> = [];

      // Check opposing parties
      const parties = listOpposingParties();
      for (const p of parties) {
        if (p.name.toLowerCase().includes(name)) {
          conflicts.push({
            type: "parte_contraria",
            entity: p.name,
            detail: `Parte contrária em ${p.matters.length} demanda(s)`,
          });
        }
        if (p.lawyer?.toLowerCase().includes(name)) {
          conflicts.push({
            type: "advogado_contrario",
            entity: p.lawyer,
            detail: `Advogado da parte contrária`,
          });
        }
      }

      // Check if name appears as client (would be conflict)
      const leads = listLeads();
      for (const l of leads) {
        if (l.name.toLowerCase().includes(name)) {
          conflicts.push({
            type: "cliente_existente",
            entity: l.name,
            detail: `Lead existente: ${l.status}`,
          });
        }
      }

      return json(res, { hasConflicts: conflicts.length > 0, conflicts });
    }

    return methodNotAllowed(res);
  }

  // ── Crop Seasons ────────────────────────────────────────────────
  if (resource === "crop-seasons") {
    const user = requireAuth(req, res, "matters");
    if (!user) return;
    const isWrite = req.method === "POST" || req.method === "PATCH";
    const rl = await checkUserRateLimit(user.id, isWrite ? "write" : "default");
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) return json(res, { error: "Rate limit excedido" }, 429);

    if (req.method === "GET") {
      const { listCropSeasons } = await import("../../shared/agro/store.js");
      const year = req.query.year ? Number(req.query.year) : undefined;
      const region = req.query.region as string | undefined;
      return json(res, listCropSeasons({ year, region }));
    }
    if (req.method === "POST") {
      const body = getBody(req.body);
      const { listCropSeasons, addCropSeason } = await import("../../shared/agro/store.js");
      const season = {
        id: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: String(body.name || ""),
        year: Number(body.year || new Date().getFullYear()),
        plantingStart: String(body.plantingStart || ""),
        plantingEnd: String(body.plantingEnd || ""),
        harvestStart: String(body.harvestStart || ""),
        harvestEnd: String(body.harvestEnd || ""),
        mainCrop: String(body.mainCrop || ""),
        region: body.region ? String(body.region) : undefined,
        notes: body.notes ? String(body.notes) : undefined,
        createdAt: new Date().toISOString(),
      };
      addCropSeason(season);
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "matter" as AuditEntityType,
        season as unknown as Record<string, unknown>,
      );
      return json(res, season, 201);
    }
    return methodNotAllowed(res);
  }

  // ── Tax Obligations ─────────────────────────────────────────────
  if (resource === "tax-obligations") {
    const user = requireAuth(req, res, "matters");
    if (!user) return;
    const isWrite = req.method === "POST" || req.method === "PATCH";
    const rl = await checkUserRateLimit(user.id, isWrite ? "write" : "default");
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) return json(res, { error: "Rate limit excedido" }, 429);

    if (req.method === "GET") {
      const { listTaxObligations } = await import("../../shared/agro/store.js");
      const propertyId = req.query.propertyId as string | undefined;
      const accountId = req.query.accountId as string | undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      return json(res, listTaxObligations({ propertyId, accountId, year }));
    }
    if (req.method === "POST") {
      const body = getBody(req.body);
      const { addTaxObligation } = await import("../../shared/agro/store.js");
      const tax = {
        id: `tax-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        propertyId: String(body.propertyId || ""),
        accountId: String(body.accountId || ""),
        type: String(body.type || "itr") as any,
        year: Number(body.year || new Date().getFullYear()),
        valueBrl: Number(body.valueBrl || 0),
        dueDate: String(body.dueDate || ""),
        paidDate: body.paidDate ? String(body.paidDate) : null,
        status: String(body.status || "pendente") as any,
        notes: body.notes ? String(body.notes) : undefined,
        createdAt: new Date().toISOString(),
      };
      addTaxObligation(tax);
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "matter" as AuditEntityType,
        tax as unknown as Record<string, unknown>,
      );
      return json(res, tax, 201);
    }
    return methodNotAllowed(res);
  }

  // ── Environmental Licenses ──────────────────────────────────────
  if (resource === "environmental-licenses") {
    const user = requireAuth(req, res, "matters");
    if (!user) return;
    const isWrite = req.method === "POST" || req.method === "PATCH";
    const rl = await checkUserRateLimit(user.id, isWrite ? "write" : "default");
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) return json(res, { error: "Rate limit excedido" }, 429);

    if (req.method === "GET") {
      const { listEnvironmentalLicenses } = await import("../../shared/agro/store.js");
      const propertyId = req.query.propertyId as string | undefined;
      const accountId = req.query.accountId as string | undefined;
      return json(res, listEnvironmentalLicenses({ propertyId, accountId }));
    }
    if (req.method === "POST") {
      const body = getBody(req.body);
      const { addEnvironmentalLicense } = await import("../../shared/agro/store.js");
      const license = {
        id: `lic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        propertyId: String(body.propertyId || ""),
        accountId: String(body.accountId || ""),
        type: String(body.type || ""),
        number: String(body.number || ""),
        issuer: String(body.issuer || ""),
        issuedAt: String(body.issuedAt || ""),
        expiresAt: String(body.expiresAt || ""),
        status: String(body.status || "vigente") as any,
        conditions: Array.isArray(body.conditions) ? body.conditions.map(String) : [],
        notes: body.notes ? String(body.notes) : undefined,
        createdAt: new Date().toISOString(),
      };
      addEnvironmentalLicense(license);
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "matter" as AuditEntityType,
        license as unknown as Record<string, unknown>,
      );
      return json(res, license, 201);
    }
    return methodNotAllowed(res);
  }

  // ── Credit Instruments ──────────────────────────────────────────
  if (resource === "credit-instruments") {
    const user = requireAuth(req, res, "matters");
    if (!user) return;
    const isWrite = req.method === "POST" || req.method === "PATCH";
    const rl = await checkUserRateLimit(user.id, isWrite ? "write" : "default");
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) return json(res, { error: "Rate limit excedido" }, 429);

    if (req.method === "GET") {
      const { listCreditInstruments } = await import("../../shared/agro/store.js");
      const accountId = req.query.accountId as string | undefined;
      const matterId = req.query.matterId as string | undefined;
      return json(res, listCreditInstruments({ accountId, matterId }));
    }
    if (req.method === "POST") {
      const body = getBody(req.body);
      const { addCreditInstrument } = await import("../../shared/agro/store.js");
      const instrument = {
        id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        accountId: String(body.accountId || ""),
        matterId: body.matterId ? String(body.matterId) : null,
        type: String(body.type || "cpr") as any,
        number: String(body.number || ""),
        issuer: body.issuer ? String(body.issuer) : undefined,
        valueBrl: Number(body.valueBrl || 0),
        interestRate: body.interestRate ? Number(body.interestRate) : undefined,
        iofRate: body.iofRate ? Number(body.iofRate) : undefined,
        issueDate: String(body.issueDate || ""),
        maturityDate: String(body.maturityDate || ""),
        paymentMethod: body.paymentMethod ? String(body.paymentMethod) : undefined,
        installments: body.installments ? Number(body.installments) : undefined,
        status: String(body.status || "ativo") as any,
        notes: body.notes ? String(body.notes) : undefined,
        createdAt: new Date().toISOString(),
      };
      addCreditInstrument(instrument);
      auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "matter" as AuditEntityType,
        instrument as unknown as Record<string, unknown>,
      );
      return json(res, instrument, 201);
    }
    return methodNotAllowed(res);
  }

  return json(res, { error: "Recurso não encontrado" }, 404);
}
