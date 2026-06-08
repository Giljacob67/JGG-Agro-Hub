import { authenticate, resolveSession } from "@shared/agro/auth";
import { computeCrmStats } from "@shared/agro/stats";
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
    return { status: 200, data: listLeads() };
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
    return { status: 200, data: listAccounts() };
  }

  if (pathname === "/api/agro/opportunities") {
    const id = params.get("id");
    if (id) {
      const opp = getOpportunity(id);
      return opp
        ? { status: 200, data: opp }
        : { status: 404, data: { error: "Oportunidade não encontrada" } };
    }
    return { status: 200, data: listOpportunities() };
  }

  if (pathname === "/api/agro/matters") {
    const id = params.get("id");
    if (id) {
      const matter = getMatter(id);
      return matter
        ? { status: 200, data: matter }
        : { status: 404, data: { error: "Demanda não encontrada" } };
    }
    return { status: 200, data: listMatters() };
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
    return { status: 200, data: listTasks() };
  }

  if (pathname === "/api/agro/stats") {
    return { status: 200, data: computeCrmStats() };
  }

  return { status: 404, data: { error: "Rota não encontrada" } };
}