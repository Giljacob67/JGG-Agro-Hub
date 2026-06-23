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
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_DOCUMENTS } from "@shared/agro/knowledge";
import { computeCrmStats } from "@shared/agro/stats";
import type {
  CopilotQueryRequest,
  KnowledgeDocument,
} from "@shared/agro/types";
import {
  addActivity,
  addDeadline,
  addLead,
  addOpportunity,
  getAccount,
  getAccountTimeline,
  getLead,
  getMatter,
  getOpportunity,
  getRelatedTasks,
  getTask,
  listAccounts,
  listActivities,
  listDeadlines,
  listLeads,
  listMatters,
  listMattersByOpportunity,
  listOpportunities,
  listTasks,
  nextActivityId,
  nextDeadlineId,
  nextOpportunityId,
  patchDeadline,
  patchLead,
  patchMatter,
  patchOpportunity,
  patchTask,
} from "@shared/agro/store";
import {
  buildOpportunityFromLead,
  conversionActivitySummary,
  conversionBlockReason,
  todayIso,
} from "@shared/agro/convert";
import type {
  Activity,
  ActivityEntityType,
  Deadline,
  Lead,
  LeadStatus,
  TaskStatus,
} from "@shared/agro/types";

function parseQuery(path: string) {
  const [pathname, search] = path.split("?");
  const params = new URLSearchParams(search ?? "");
  return { pathname, params };
}

// Espelho mutável da base de conhecimento para o modo mock (preview).
let mockKbDocs: KnowledgeDocument[] | null = null;
function getMockKbDocs(): KnowledgeDocument[] {
  if (!mockKbDocs) {
    mockKbDocs = KNOWLEDGE_DOCUMENTS.map((d) => ({ ...d, tags: [...d.tags] }));
  }
  return mockKbDocs;
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

  if (pathname === "/api/auth/logout" && init?.method === "POST") {
    return { status: 200, data: { ok: true } };
  }

  const user = resolveSession(token);
  if (!user) return { status: 401, data: { error: "Não autenticado" } };

  if (pathname === "/api/agro/leads") {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));

      if (params.get("action") === "convert" || body.action === "convert") {
        const id = params.get("id") ?? body.id;
        if (!id) return { status: 400, data: { error: "id é obrigatório" } };
        const lead = getLead(id);
        const blocked = conversionBlockReason(lead);
        if (blocked === "not_found") {
          return { status: 404, data: { error: "Lead não encontrado", reason: blocked } };
        }
        if (blocked) {
          const message =
            blocked === "already_converted"
              ? "Lead já convertido em oportunidade"
              : "Lead descartado não pode ser convertido";
          return { status: 409, data: { error: message, reason: blocked } };
        }
        const safeLead = lead as Lead;
        const opportunity = buildOpportunityFromLead(safeLead, nextOpportunityId(), {
          title: body.title,
          valueBrl: body.valueBrl != null ? Number(body.valueBrl) : undefined,
          practice: body.practice,
          owner: body.owner,
          expectedClose: body.expectedClose,
        });
        addOpportunity(opportunity);
        patchLead(safeLead.id, {
          status: "qualificado",
          convertedOpportunityId: opportunity.id,
        });
        addActivity({
          id: nextActivityId(),
          entityType: "lead",
          entityId: safeLead.id,
          type: "sistema",
          summary: conversionActivitySummary(opportunity.id),
          date: todayIso(),
          owner: opportunity.owner,
          createdAt: new Date().toISOString(),
        });
        addActivity({
          id: nextActivityId(),
          entityType: "opportunity",
          entityId: opportunity.id,
          type: "sistema",
          summary: `Oportunidade criada a partir do lead ${safeLead.id} (${safeLead.name}).`,
          date: todayIso(),
          owner: opportunity.owner,
          createdAt: new Date().toISOString(),
        });
        return {
          status: 201,
          data: { ok: true, lead: getLead(safeLead.id), opportunity },
        };
      }

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

    const opportunityId = params.get("opportunityId");
    if (opportunityId) {
      return { status: 200, data: listMattersByOpportunity(opportunityId) };
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

  if (pathname === "/api/agro/deadlines") {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      if (!body.matterId || !body.title || !body.type || !body.dueDate || !body.owner) {
        return {
          status: 400,
          data: { error: "matterId, title, type, dueDate e owner são obrigatórios" },
        };
      }
      if (!getMatter(body.matterId)) {
        return { status: 404, data: { error: "Demanda não encontrada" } };
      }
      const deadline: Deadline = {
        id: nextDeadlineId(),
        matterId: body.matterId,
        title: body.title,
        type: body.type,
        status: "pendente",
        dueDate: body.dueDate,
        owner: body.owner,
        completedAt: null,
        ...(body.notes ? { notes: body.notes } : {}),
      };
      addDeadline(deadline);
      return { status: 201, data: deadline };
    }

    if (init?.method === "PATCH") {
      const id = params.get("id");
      if (!id) return { status: 400, data: { error: "id é obrigatório" } };
      const body = JSON.parse(String(init.body));
      const deadline = patchDeadline(id, body);
      return deadline
        ? { status: 200, data: deadline }
        : { status: 404, data: { error: "Prazo não encontrado" } };
    }

    const matterId = params.get("matterId") ?? undefined;
    return { status: 200, data: listDeadlines(matterId) };
  }

  if (pathname === "/api/agro/activities") {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      if (!body.entityType || !body.entityId || !body.type || !body.summary || !body.owner) {
        return {
          status: 400,
          data: { error: "entityType, entityId, type, summary e owner são obrigatórios" },
        };
      }
      const activity: Activity = {
        id: nextActivityId(),
        entityType: body.entityType,
        entityId: body.entityId,
        type: body.type,
        summary: body.summary,
        date: body.date ?? todayIso(),
        owner: body.owner,
        createdAt: new Date().toISOString(),
      };
      addActivity(activity);
      return { status: 201, data: activity };
    }

    const entityId = params.get("entityId") ?? undefined;
    const entityType =
      (params.get("entityType") as ActivityEntityType | null) ?? undefined;
    return { status: 200, data: listActivities(entityId, entityType) };
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
    const docs = getMockKbDocs();

    if (!init?.method || init.method === "GET") {
      const categoryId = params.get("categoryId") ?? undefined;
      const filtered = categoryId
        ? docs.filter((d) => d.categoryId === categoryId)
        : docs;
      const sorted = [...filtered].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      return {
        status: 200,
        data: { categories: KNOWLEDGE_CATEGORIES, documents: sorted },
      };
    }

    if (user.role !== "gestao") {
      return {
        status: 403,
        data: {
          error: "Apenas perfis de gestão podem gerenciar a base de conhecimento",
        },
      };
    }

    if (init.method === "POST") {
      const body = JSON.parse(String(init.body));
      const doc: KnowledgeDocument = {
        id: `kb-${crypto.randomUUID()}`,
        categoryId: String(body.categoryId),
        title: String(body.title),
        summary: String(body.summary),
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        type: body.type ?? "guia",
        status: body.status ?? "rascunho",
        body: body.body != null ? String(body.body) : undefined,
        fileUrl: body.fileUrl != null ? String(body.fileUrl) : undefined,
        fileName: body.fileName != null ? String(body.fileName) : undefined,
        fileSize: body.fileSize != null ? Number(body.fileSize) : undefined,
        fileType: body.fileType != null ? String(body.fileType) : undefined,
        updatedAt: new Date().toISOString(),
      };
      docs.unshift(doc);
      return { status: 201, data: doc };
    }

    const id = params.get("id") ?? undefined;
    if (!id) return { status: 400, data: { error: "id é obrigatório" } };
    const idx = docs.findIndex((d) => d.id === id);
    if (idx < 0) return { status: 404, data: { error: "Documento não encontrado" } };

    if (init.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      const next: KnowledgeDocument = {
        ...docs[idx],
        ...(body.categoryId !== undefined ? { categoryId: String(body.categoryId) } : {}),
        ...(body.title !== undefined ? { title: String(body.title) } : {}),
        ...(body.summary !== undefined ? { summary: String(body.summary) } : {}),
        ...(body.tags !== undefined
          ? { tags: Array.isArray(body.tags) ? body.tags.map(String) : [] }
          : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.body !== undefined
          ? { body: body.body != null ? String(body.body) : undefined }
          : {}),
        ...(body.fileUrl !== undefined
          ? { fileUrl: body.fileUrl != null ? String(body.fileUrl) : undefined }
          : {}),
        ...(body.fileName !== undefined
          ? { fileName: body.fileName != null ? String(body.fileName) : undefined }
          : {}),
        ...(body.fileSize !== undefined
          ? { fileSize: body.fileSize != null ? Number(body.fileSize) : undefined }
          : {}),
        ...(body.fileType !== undefined
          ? { fileType: body.fileType != null ? String(body.fileType) : undefined }
          : {}),
        updatedAt: new Date().toISOString(),
      };
      docs[idx] = next;
      return { status: 200, data: next };
    }

    if (init.method === "DELETE") {
      docs.splice(idx, 1);
      return { status: 200, data: { ok: true } };
    }

    return { status: 405, data: { error: "Método não permitido" } };
  }

  if (pathname === "/api/agro/copilot-config") {
    const status = {
      providers: [
        { id: "openai", label: "OpenAI", available: false },
        { id: "anthropic", label: "Anthropic (Claude)", available: false },
        { id: "google", label: "Google Gemini", available: false },
        { id: "ollama", label: "Ollama Cloud", available: false },
        { id: "groq", label: "Groq", available: false },
        { id: "openrouter", label: "OpenRouter", available: false },
      ],
      current: null,
      source: "none" as const,
      dbEnabled: false,
      embeddings: { modelId: "openai:text-embedding-3-small", available: false },
    };
    if (init?.method === "PATCH") {
      return {
        status: 400,
        data: {
          error:
            "Configuração runtime indisponível no modo local (sem provedores nem banco de dados).",
        },
      };
    }
    return { status: 200, data: status };
  }

  return { status: 404, data: { error: "Rota não encontrada" } };
}
