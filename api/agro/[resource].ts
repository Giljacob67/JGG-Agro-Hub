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
  getCrmStats,
} from "../_lib/data-service.js";
import { resolveCopilotQuery } from "../../shared/agro/copilot.js";
import { KNOWLEDGE_CATEGORIES } from "../../shared/agro/knowledge.js";
import {
  parseLeadListQuery,
  parseAccountListQuery,
  parseOpportunityListQuery,
  parseMatterListQuery,
  parseTaskListQuery,
} from "../_lib/list-query.js";
import { json, methodNotAllowed, requireAuth, requireCsrf, guardWrite, applyCors, clientIp } from "../_lib/http.js";
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
  parseDocumentCreate,
  parseDocumentPatch,
  parseDocumentChecklistCreate,
  parseDocumentChecklistPatch,
  parseTimeEntryCreate,
  parseTimeEntryPatch,
  parseInvoiceCreate,
  parseInvoicePatch,
  parseFeeAgreementCreate,
  parseContactCreate,
  parseContactPatch,
  parsePropertyCreate,
  parsePropertyPatch,
  parseOpposingPartyCreate,
  parseOpposingPartyPatch,
  parseKnowledgeDocCreate,
  parseKnowledgeDocUpdate,
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
  applyCors(req, res);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
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
    if (isWrite && !guardWrite(res, "leads")) return;
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
                await auditCreate(
          { userId: user.id, userName: user.name, userRole: user.role },
          "lead" as AuditEntityType,
          result.opportunity as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
        );
        return json(res, result, 201);
      }

      const input = parseLeadCreate(body);
      if (!input.ok) return json(res, { error: input.error }, 400);
      const lead = await createLead(input.data);
            await auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "lead" as AuditEntityType,
        lead as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
            await auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "lead" as AuditEntityType,
        id,
        lead.name,
        before as unknown as Record<string, unknown>,
        lead as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
            await auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "lead" as AuditEntityType,
        lead as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
    if (isWrite && !guardWrite(res, "accounts")) return;
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
            await auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "account" as AuditEntityType,
        account as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
            await auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "account" as AuditEntityType,
        id,
        account.name,
        before as unknown as Record<string, unknown>,
        account as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
            await auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
          "account" as AuditEntityType,
          account as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
    if (isWrite && !guardWrite(res, "opportunities")) return;
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
            await auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "opportunity" as AuditEntityType,
        opp as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
            await auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "opportunity" as AuditEntityType,
        id,
        opp.title,
        before as unknown as Record<string, unknown>,
        opp as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
            await auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "opportunity" as AuditEntityType,
        opp as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
    if (isWrite && !guardWrite(res, "matters")) return;
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
            await auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "matter" as AuditEntityType,
        matter as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
            await auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "matter" as AuditEntityType,
        id,
        matter.title,
        before as unknown as Record<string, unknown>,
        matter as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
            await auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "matter" as AuditEntityType,
        matter as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
    if (isWrite && !guardWrite(res, "tasks")) return;
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
            await auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "task" as AuditEntityType,
        task as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
            await auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "task" as AuditEntityType,
        id,
        task.title,
        before as unknown as Record<string, unknown>,
        task as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
            await auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "task" as AuditEntityType,
        task as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
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
    if (isWrite && !guardWrite(res, "deadlines")) return;
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
    if (req.method !== "GET" && !guardWrite(res, "activities")) return;

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
      return json(res, await getCrmStats());
    }

    return methodNotAllowed(res);
  }

  // ── Copilot ────────────────────────────────────────────────────────
  if (resource === "copilot") {
    const user = requireAuth(req, res, "copilot");
    if (!user) return;

    if (req.method === "POST") {
      const rl = await checkUserRateLimit(user.id, "copilot");
      res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
      if (!rl.allowed) {
        return json(res, { error: "Rate limit excedido — copilot" }, 429);
      }

      const body = (req.body ?? {}) as {
        query?: string;
        contextEntity?: import("../../shared/agro/types.js").CopilotContextEntity | null;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
      };
      if (!body.query?.trim()) {
        return json(res, { error: "query é obrigatório" }, 400);
      }

      const stats = await getCrmStats();

      const query = body.query.trim();
      const contextEntity = body.contextEntity ?? null;

      // Try LLM pipeline first; fall back to keyword engine
      try {
        const { createProvider } = await import("../_lib/llm/providers.js");
        const { resolveLlmConfig } = await import("../_lib/llm/config.js");
        const { config: llmConfig } = await resolveLlmConfig();

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

  // ── Copilot config (provider/model runtime) ────────────────────────
  if (resource === "copilot-config") {
    const user = requireAuth(req, res, "copilot");
    if (!user) return;

    const { getCopilotConfigStatus } = await import("../_lib/llm/config.js");

    if (req.method === "GET") {
      return json(res, await getCopilotConfigStatus());
    }

    if (req.method === "PATCH") {
      const { hasPermission } = await import("../../shared/agro/auth.js");
      if (!hasPermission(user.role, "copilot", "update")) {
        return json(
          res,
          { error: "Apenas perfis de gestão podem alterar a configuração da IA" },
          403,
        );
      }

      const body = getBody(req.body) as {
        provider?: string;
        model?: string;
        temperature?: number;
      };
      if (!body.provider || !body.model) {
        return json(res, { error: "provider e model são obrigatórios" }, 400);
      }

      const { setLlmConfig } = await import("../_lib/llm/config.js");
      const result = await setLlmConfig(
        {
          provider: body.provider,
          model: body.model,
          temperature: body.temperature,
        },
        user.email,
      );
      if (!result.ok) return json(res, { error: result.error }, 400);

      await auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "config" as AuditEntityType,
        "copilot.llm",
        `${body.provider}:${body.model}`,
        {},
        { provider: body.provider, model: body.model, temperature: body.temperature },
        { ip: clientIp(req) },
      );

      return json(res, await getCopilotConfigStatus());
    }

    return methodNotAllowed(res);
  }

  // ── Knowledge ──────────────────────────────────────────────────────
  if (resource === "knowledge") {
    const user = requireAuth(req, res, "knowledge");
    if (!user) return;

    const isWrite = req.method !== "GET";
    if (isWrite && !guardWrite(res, "knowledge")) return;

    const {
      listKnowledgeDocuments,
      getKnowledgeDoc,
      createKnowledgeDocument,
      updateKnowledgeDocument,
      deleteKnowledgeDocument,
    } = await import("../_lib/data-service.js");

    if (req.method === "GET") {
      const categoryId =
        typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
      return json(res, {
        categories: KNOWLEDGE_CATEGORIES,
        documents: await listKnowledgeDocuments(categoryId),
      });
    }

    // Escrita: apenas perfis de gestão (hasPermission cobre wildcard de gestao).
    const { hasPermission } = await import("../../shared/agro/auth.js");
    const action =
      req.method === "POST" ? "create" : req.method === "DELETE" ? "delete" : "update";
    if (!hasPermission(user.role, "knowledge", action)) {
      return json(
        res,
        { error: "Apenas perfis de gestão podem gerenciar a base de conhecimento" },
        403,
      );
    }

    if (req.method === "POST") {
      const parsed = parseKnowledgeDocCreate(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const doc = await createKnowledgeDocument(parsed.data as never);
      await auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "knowledge" as AuditEntityType,
        doc as unknown as Record<string, unknown>,
        { ip: clientIp(req) },
      );
      return json(res, doc, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const parsed = parseKnowledgeDocUpdate(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const before = await getKnowledgeDoc(id);
      if (!before) return json(res, { error: "Documento não encontrado" }, 404);
      const doc = await updateKnowledgeDocument(id, parsed.data as never);
      if (!doc) return json(res, { error: "Documento não encontrado" }, 404);
      await auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "knowledge" as AuditEntityType,
        id,
        doc.title,
        before as unknown as Record<string, unknown>,
        doc as unknown as Record<string, unknown>,
        { ip: clientIp(req) },
      );
      return json(res, doc);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const before = await getKnowledgeDoc(id);
      if (!before) return json(res, { error: "Documento não encontrado" }, 404);
      await deleteKnowledgeDocument(id);
      await auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "knowledge" as AuditEntityType,
        before as unknown as Record<string, unknown>,
        { ip: clientIp(req) },
      );
      return json(res, { ok: true });
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
        return json(res, await getAuditStats());
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
        const { logs } = await queryAuditLogs(filters);
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
      const { logs, total } = await queryAuditLogs(filters);
      return json(res, { items: logs, total, limit: filters.limit ?? 50, offset: filters.offset ?? 0 });
    }

    return methodNotAllowed(res);
  }

  // ── Email ──────────────────────────────────────────────────────────
  if (resource === "email") {
    const user = requireAuth(req, res, "email");
    if (!user) return;

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
      const rl = await checkUserRateLimit(user.id, "write");
      res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
      if (!rl.allowed) {
        return json(res, { error: "Rate limit excedido" }, 429);
      }

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
    const user = requireAuth(req, res, "leads");
    if (!user) return;

    if (req.method === "GET") {
      const rl = await checkUserRateLimit(user.id, "default");
      res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
      if (!rl.allowed) {
        return json(res, { error: "Rate limit excedido" }, 429);
      }

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
    const user = requireAuth(req, res, "documents");
    if (!user) return;
    if (!requireCsrf(req, res)) return;
    if (req.method !== "GET" && !guardWrite(res, "documents")) return;

    if (req.method === "GET") {
      const { listDocuments } = await import("../_lib/data-service.js");
      const docs = await listDocuments({
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        matterId: req.query.matterId as string,
      });
      return json(res, docs);
    }

    if (req.method === "POST") {
      const parsed = parseDocumentCreate(getBody(req.body), user.name);
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { createDocument } = await import("../_lib/data-service.js");
      const doc = await createDocument(parsed.data as any);
            await auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "document",
        doc as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
      );
      return json(res, doc, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const parsed = parseDocumentPatch(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { getDocument, updateDocument } = await import("../_lib/data-service.js");
      const before = await getDocument(id);
      if (!before) return json(res, { error: "Documento não encontrado" }, 404);
      const doc = await updateDocument(id, parsed.data as any);
      if (!doc) return json(res, { error: "Documento não encontrado" }, 404);
            await auditUpdate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "document",
        id,
        doc.name,
        before as unknown as Record<string, unknown>,
        doc as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
      );
      return json(res, doc);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { getDocument, deleteDocument } = await import("../_lib/data-service.js");
      const doc = await getDocument(id);
      if (!doc) return json(res, { error: "Documento não encontrado" }, 404);
      await deleteDocument(id);
            await auditDelete(
        { userId: user.id, userName: user.name, userRole: user.role },
        "document",
        doc as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
      );
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Document Checklist ────────────────────────────────────────────
  if (resource === "document-checklist") {
    const user = requireAuth(req, res, "document-checklist");
    if (!user) return;
    if (req.method !== "GET" && !guardWrite(res, "document-checklist")) return;

    if (req.method === "GET") {
      const matterId = req.query.matterId as string;
      if (!matterId) return json(res, { error: "matterId é obrigatório" }, 400);
      const { listDocumentChecklist } = await import("../_lib/data-service.js");
      return json(res, await listDocumentChecklist(matterId));
    }

    if (req.method === "POST") {
      const parsed = parseDocumentChecklistCreate(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { createDocumentChecklistItem } = await import("../_lib/data-service.js");
      const item = await createDocumentChecklistItem(parsed.data as any);
      return json(res, item, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const parsed = parseDocumentChecklistPatch(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { updateDocumentChecklistItem } = await import("../_lib/data-service.js");
      const item = await updateDocumentChecklistItem(id, parsed.data as any);
      if (!item) return json(res, { error: "Item não encontrado" }, 404);
      return json(res, item);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { deleteDocumentChecklistItem } = await import("../_lib/data-service.js");
      await deleteDocumentChecklistItem(id);
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Time Entries ──────────────────────────────────────────────────
  if (resource === "time-entries") {
    const user = requireAuth(req, res, "time-entries");
    if (!user) return;
    if (!requireCsrf(req, res)) return;
    if (req.method !== "GET" && !guardWrite(res, "time-entries")) return;

    if (req.method === "GET") {
      const { listTimeEntries } = await import("../_lib/data-service.js");
      const entries = await listTimeEntries({
        matterId: req.query.matterId as string,
        owner: req.query.owner as string,
        invoiced: req.query.invoiced === "true" ? true : req.query.invoiced === "false" ? false : undefined,
      });
      return json(res, entries);
    }

    if (req.method === "POST") {
      const parsed = parseTimeEntryCreate(getBody(req.body), user.name);
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { createTimeEntry } = await import("../_lib/data-service.js");
      const entry = await createTimeEntry(parsed.data as any);
            await auditCreate(
        { userId: user.id, userName: user.name, userRole: user.role },
        "time-entry",
        entry as unknown as Record<string, unknown>,
          { ip: clientIp(req) }
      );
      return json(res, entry, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const parsed = parseTimeEntryPatch(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { updateTimeEntry } = await import("../_lib/data-service.js");
      const entry = await updateTimeEntry(id, parsed.data as any);
      if (!entry) return json(res, { error: "Registro não encontrado" }, 404);
      return json(res, entry);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { deleteTimeEntry } = await import("../_lib/data-service.js");
      await deleteTimeEntry(id);
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Invoices ──────────────────────────────────────────────────────
  if (resource === "invoices") {
    const user = requireAuth(req, res, "invoices");
    if (!user) return;
    if (!requireCsrf(req, res)) return;
    if (req.method !== "GET" && !guardWrite(res, "invoices")) return;

    if (req.method === "GET") {
      const { listInvoices } = await import("../_lib/data-service.js");
      return json(res, await listInvoices({
        accountId: req.query.accountId as string,
        status: req.query.status as string,
      }));
    }

    if (req.method === "POST") {
      const parsed = parseInvoiceCreate(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { createInvoice } = await import("../_lib/data-service.js");
      const invoice = await createInvoice(parsed.data as any);
      return json(res, invoice, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const parsed = parseInvoicePatch(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { updateInvoice } = await import("../_lib/data-service.js");
      const invoice = await updateInvoice(id, parsed.data as any);
      if (!invoice) return json(res, { error: "Fatura não encontrada" }, 404);
      return json(res, invoice);
    }

    return methodNotAllowed(res);
  }

  // ── Fee Agreements ────────────────────────────────────────────────
  if (resource === "fee-agreements") {
    const user = requireAuth(req, res, "fee-agreements");
    if (!user) return;
    if (req.method !== "GET" && !guardWrite(res, "fee-agreements")) return;

    if (req.method === "GET") {
      const { listFeeAgreements } = await import("../_lib/data-service.js");
      return json(res, await listFeeAgreements({
        accountId: req.query.accountId as string,
        matterId: req.query.matterId as string,
      }));
    }

    if (req.method === "POST") {
      const parsed = parseFeeAgreementCreate(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { createFeeAgreement } = await import("../_lib/data-service.js");
      const agreement = await createFeeAgreement(parsed.data as any);
      return json(res, agreement, 201);
    }

    return methodNotAllowed(res);
  }

  // ── Contacts ──────────────────────────────────────────────────────
  if (resource === "contacts") {
    const user = requireAuth(req, res, "contacts");
    if (!user) return;
    if (!requireCsrf(req, res)) return;
    if (req.method !== "GET" && !guardWrite(res, "contacts")) return;

    if (req.method === "GET") {
      const { listContacts } = await import("../_lib/data-service.js");
      return json(res, await listContacts({ accountId: req.query.accountId as string }));
    }

    if (req.method === "POST") {
      const parsed = parseContactCreate(getBody(req.body), user.name);
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { createContact } = await import("../_lib/data-service.js");
      const contact = await createContact(parsed.data as any);
      return json(res, contact, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const parsed = parseContactPatch(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { updateContact } = await import("../_lib/data-service.js");
      const contact = await updateContact(id, parsed.data as any);
      if (!contact) return json(res, { error: "Contato não encontrado" }, 404);
      return json(res, contact);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { deleteContact } = await import("../_lib/data-service.js");
      await deleteContact(id);
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Properties ────────────────────────────────────────────────────
  if (resource === "properties") {
    const user = requireAuth(req, res, "properties");
    if (!user) return;
    if (!requireCsrf(req, res)) return;
    if (req.method !== "GET" && !guardWrite(res, "properties")) return;

    if (req.method === "GET") {
      const { listProperties } = await import("../_lib/data-service.js");
      return json(res, await listProperties({ accountId: req.query.accountId as string }));
    }

    if (req.method === "POST") {
      const parsed = parsePropertyCreate(getBody(req.body), user.name);
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { createProperty } = await import("../_lib/data-service.js");
      const property = await createProperty(parsed.data as any);
      return json(res, property, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const parsed = parsePropertyPatch(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { updateProperty } = await import("../_lib/data-service.js");
      const property = await updateProperty(id, parsed.data as any);
      if (!property) return json(res, { error: "Propriedade não encontrada" }, 404);
      return json(res, property);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const { deleteProperty } = await import("../_lib/data-service.js");
      await deleteProperty(id);
      return json(res, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // ── Opposing Parties ──────────────────────────────────────────────
  if (resource === "opposing-parties") {
    const user = requireAuth(req, res, "opposing-parties");
    if (!user) return;
    if (req.method !== "GET" && !guardWrite(res, "opposing-parties")) return;

    if (req.method === "GET") {
      const { listOpposingParties } = await import("../_lib/data-service.js");
      return json(res, await listOpposingParties());
    }

    if (req.method === "POST") {
      const parsed = parseOpposingPartyCreate(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { createOpposingParty } = await import("../_lib/data-service.js");
      const party = await createOpposingParty(parsed.data as any);
      return json(res, party, 201);
    }

    if (req.method === "PATCH") {
      const id = req.query.id as string | undefined;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const parsed = parseOpposingPartyPatch(getBody(req.body));
      if (!parsed.ok) return json(res, { error: parsed.error }, 400);
      const { updateOpposingParty } = await import("../_lib/data-service.js");
      const party = await updateOpposingParty(id, parsed.data as any);
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

      const { listOpposingParties, listLeads } = await import("../_lib/data-service.js");
      const conflicts: Array<{ type: string; entity: string; detail: string }> = [];

      // Check opposing parties
      const parties = await listOpposingParties();
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
      const leads = (await listLeads({ pageSize: 100 })).items;
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

  return json(res, { error: "Recurso não encontrado" }, 404);
}
