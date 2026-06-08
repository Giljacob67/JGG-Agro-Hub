import { authenticate, resolveSession } from "@shared/agro/auth";
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
} from "@shared/agro/filters";
import { paginate } from "@shared/agro/list-types";
import {
  parseAccountParams,
  parseLeadParams,
  parseMatterParams,
  parseOpportunityParams,
  parseTaskParams,
} from "@shared/agro/list-params";
import { resolveCopilotQuery } from "@shared/agro/copilot";
import { getKnowledgePayload } from "@shared/agro/knowledge";
import { computeCrmStats } from "@shared/agro/stats";
import type { CopilotQueryRequest } from "@shared/agro/types";
import {
  addLead,
  getAccount,
  getAccountTimeline,
  getLead,
  getMatter,
  getOpportunity,
  getRelatedTasks,
  getTask,
  listAccounts,
  listLeads,
  listMatters,
  listOpportunities,
  listTasks,
  patchLead,
  patchMatter,
  patchOpportunity,
  patchTask,
} from "@shared/agro/store";
import type { Lead, LeadStatus, TaskStatus } from "@shared/agro/types";

function parseQuery(path: string) {
  const [pathname, search] = path.split("?");
  const params = new URLSearchParams(search ?? "");
  return { pathname, params };
}

export async function handleLocalApi(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; data: unknown }> {
  const { pathname, params } = parseQuery(path);
  const token = init?.headers
    ? (init.headers as Record<string, string>)["Authorization"]?.replace("Bearer ", "")
    : undefined;

  if (pathname === "/api/auth/login" && init?.method === "POST") {
    const body = JSON.parse(String(init.body));
    const result = authenticate(body.email, body.password);
    if (!result) return { status: 401, data: { error: "Credenciais inválidas" } };
    return { status: 200, data: result };
  }

  if (pathname === "/api/auth/me") {
    const user = resolveSession(token);
    if (!user) return { status: 401, data: { error: "Não autenticado" } };
    return { status: 200, data: user };
  }

  const user = resolveSession(token);
  if (!user) return { status: 401, data: { error: "Não autenticado" } };

  if (pathname === "/api/agro/leads") {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      const today = new Date().toISOString().slice(0, 10);
      const id = `LD-${String(listLeads().length + 1).padStart(3, "0")}`;
      const lead: Lead = {
        id,
        name: body.name,
        contact: body.contact ?? "",
        region: body.region,
        crop: body.crop ?? "",
        source: body.source ?? "Manual",
        status: (body.status as LeadStatus) ?? "novo",
        owner: body.owner,
        notes: body.notes ?? "",
        nextContact: body.nextContact ?? null,
        accountId: body.accountId ?? null,
        createdAt: today,
        leadType: body.leadType,
        legalPain: body.legalPain,
        interestArea: body.interestArea,
        priority: body.priority,
      };
      addLead(lead);
      return { status: 201, data: lead };
    }

    if (init?.method === "PATCH") {
      const id = params.get("id");
      if (!id) return { status: 400, data: { error: "id é obrigatório" } };
      const body = JSON.parse(String(init.body));
      const lead = patchLead(id, body);
      return lead
        ? { status: 200, data: lead }
        : { status: 404, data: { error: "Lead não encontrado" } };
    }

    const id = params.get("id");
    if (id) {
      const lead = getLead(id);
      return lead
        ? { status: 200, data: lead }
        : { status: 404, data: { error: "Lead não encontrado" } };
    }

    const query = parseLeadParams(params);
    const all = listLeads();
    const result = paginate(filterLeads(all, query), query);
    if (query.facets) result.facets = buildLeadFacets(all);
    return { status: 200, data: result };
  }

  if (pathname === "/api/agro/accounts") {
    const id = params.get("id");
    if (id) {
      const account = getAccount(id);
      if (!account) return { status: 404, data: { error: "Conta não encontrada" } };
      if (params.get("timeline") === "1") {
        return { status: 200, data: { account, timeline: getAccountTimeline(id) } };
      }
      return { status: 200, data: account };
    }

    const query = parseAccountParams(params);
    const all = listAccounts();
    const result = paginate(filterAccounts(all, query), query);
    if (query.facets) result.facets = buildAccountFacets(all);
    return { status: 200, data: result };
  }

  if (pathname === "/api/agro/opportunities") {
    if (init?.method === "PATCH") {
      const id = params.get("id");
      if (!id) return { status: 400, data: { error: "id é obrigatório" } };
      const body = JSON.parse(String(init.body));
      const opp = patchOpportunity(id, body);
      return opp
        ? { status: 200, data: opp }
        : { status: 404, data: { error: "Oportunidade não encontrada" } };
    }

    const id = params.get("id");
    if (id) {
      const opp = getOpportunity(id);
      return opp
        ? { status: 200, data: opp }
        : { status: 404, data: { error: "Oportunidade não encontrada" } };
    }

    const query = parseOpportunityParams(params);
    const all = listOpportunities();
    const result = paginate(filterOpportunities(all, query), query);
    if (query.facets) result.facets = buildOpportunityFacets(all);
    return { status: 200, data: result };
  }

  if (pathname === "/api/agro/matters") {
    if (init?.method === "PATCH") {
      const id = params.get("id");
      if (!id) return { status: 400, data: { error: "id é obrigatório" } };
      const body = JSON.parse(String(init.body));
      const matter = patchMatter(id, body);
      return matter
        ? { status: 200, data: matter }
        : { status: 404, data: { error: "Demanda não encontrada" } };
    }

    const id = params.get("id");
    if (id) {
      const matter = getMatter(id);
      return matter
        ? { status: 200, data: matter }
        : { status: 404, data: { error: "Demanda não encontrada" } };
    }

    const query = parseMatterParams(params);
    const all = listMatters();
    const result = paginate(filterMatters(all, query), query);
    if (query.facets) result.facets = buildMatterFacets(all);
    return { status: 200, data: result };
  }

  if (pathname === "/api/agro/tasks") {
    if (init?.method === "PATCH") {
      const id = params.get("id");
      const body = JSON.parse(String(init.body));
      if (!id || !body.status) {
        return { status: 400, data: { error: "id e status são obrigatórios" } };
      }
      const task = patchTask(id, { status: body.status as TaskStatus });
      return task
        ? { status: 200, data: task }
        : { status: 404, data: { error: "Tarefa não encontrada" } };
    }

    const relatedTo = params.get("relatedTo");
    if (relatedTo) return { status: 200, data: getRelatedTasks(relatedTo) };
    const id = params.get("id");
    if (id) {
      const task = getTask(id);
      return task
        ? { status: 200, data: task }
        : { status: 404, data: { error: "Tarefa não encontrada" } };
    }

    const query = parseTaskParams(params);
    const all = listTasks();
    const result = paginate(filterTasks(all, query), query);
    if (query.facets) result.facets = buildTaskFacets(all);
    return { status: 200, data: result };
  }

  if (pathname === "/api/agro/stats") {
    return { status: 200, data: computeCrmStats() };
  }

  if (pathname === "/api/agro/copilot/query" && init?.method === "POST") {
    const body = JSON.parse(String(init.body)) as CopilotQueryRequest;
    if (!body.query?.trim()) {
      return { status: 400, data: { error: "query é obrigatório" } };
    }
    const stats = computeCrmStats();
    return {
      status: 200,
      data: resolveCopilotQuery(
        { query: body.query.trim(), contextEntity: body.contextEntity ?? null },
        stats,
      ),
    };
  }

  if (pathname === "/api/agro/knowledge") {
    const categoryId = params.get("categoryId") ?? undefined;
    return { status: 200, data: getKnowledgePayload(categoryId || undefined) };
  }

  return { status: 404, data: { error: "Rota não encontrada" } };
}