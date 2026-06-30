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
  sortItems,
  LEAD_SORT,
  ACCOUNT_SORT,
  OPPORTUNITY_SORT,
  MATTER_SORT,
  TASK_SORT,
} from "@shared/agro/sort";
import {
  parseAccountParams,
  parseLeadParams,
  parseMatterParams,
  parseOpportunityParams,
  parseTaskParams,
} from "@shared/agro/list-params";
import { resolveCopilotQuery } from "@shared/agro/copilot";
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_DOCUMENTS } from "@shared/agro/knowledge";
import { computeCrmStats, computeCrmTimeseries } from "@shared/agro/stats";
import type {
  AiAssistRequest,
  AiAssistResponse,
  CopilotQueryRequest,
  KnowledgeDocument,
} from "@shared/agro/types";
import {
  addActivity,
  addDeadline,
  addLead,
  addLeadList,
  addOpportunity,
  getAccount,
  getAccountTimeline,
  getLead,
  getLeadList,
  getMatter,
  getOpportunity,
  getRelatedTasks,
  getTask,
  listAccounts,
  listActivities,
  listDeadlines,
  listLeadLists,
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
  patchLeadList,
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
  AgroRole,
  Deadline,
  Lead,
  LeadList,
  LeadStatus,
  ManagedUser,
  Meeting,
  TaskStatus,
} from "@shared/agro/types";

function parseQuery(path: string) {
  const [pathname, search] = path.split("?");
  const params = new URLSearchParams(search ?? "");
  return { pathname, params };
}

// Sessão do modo mock: o backend real usa cookie HttpOnly, que o mock não
// consegue ler. Persistimos o token retornado pelo /login em sessionStorage
// dedicado para emular a sessão nas chamadas seguintes, sem depender do
// Authorization header (que o client limpa em favor do cookie de produção).
const MOCK_SESSION_KEY = "agro_mock_session";

function readMockSession(): string | undefined {
  try {
    return sessionStorage.getItem(MOCK_SESSION_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeMockSession(token: string | null) {
  try {
    if (token) sessionStorage.setItem(MOCK_SESSION_KEY, token);
    else sessionStorage.removeItem(MOCK_SESSION_KEY);
  } catch {
    /* sessionStorage indisponível (SSR/headless) — ignora. */
  }
}

// Espelho mutável da base de conhecimento para o modo mock (preview).
let mockKbDocs: KnowledgeDocument[] | null = null;
function getMockKbDocs(): KnowledgeDocument[] {
  if (!mockKbDocs) {
    mockKbDocs = KNOWLEDGE_DOCUMENTS.map((d) => ({ ...d, tags: [...d.tags] }));
  }
  return mockKbDocs;
}

// Espelho mutável de usuários para o modo mock (preview/dev local).
let mockUsers: ManagedUser[] | null = null;
function getMockUsers(): ManagedUser[] {
  if (!mockUsers) {
    mockUsers = [
      { id: "usr-1", email: "agro@jgggroup.com.br", name: "Equipe Gestão Agro", role: "gestao", active: true, hasPassword: true },
      { id: "usr-2", email: "comercial@jgggroup.com.br", name: "Carlos Mendes", role: "comercial", active: true, hasPassword: true },
      { id: "usr-3", email: "juridico@jgggroup.com.br", name: "Equipe Jurídica Agro", role: "juridico", active: true, hasPassword: true },
    ];
  }
  return mockUsers;
}

// Espelho mutável de reuniões para o modo mock (preview/dev local).
let mockMeetings: Meeting[] | null = null;
function getMockMeetings(): Meeting[] {
  if (!mockMeetings) mockMeetings = [];
  return mockMeetings;
}

const AI_ASSIST_DISCLAIMER =
  "Conteúdo gerado por IA (modo offline determinístico). Revise antes de usar — não substitui parecer de advogado responsável.";

/**
 * Mock determinístico do AI-assist para dev/preview sem LLM. Espelha o
 * formato da resposta real, derivando texto do próprio registro.
 */
function resolveAiAssistMock(
  body: AiAssistRequest,
):
  | AiAssistResponse
  | { error: string; status: number } {
  const TASKS = ["summarize_matter", "draft_notes", "enrich_lead", "next_steps"];
  if (!TASKS.includes(body.task)) return { error: "task inválido", status: 400 };

  let entity: Record<string, unknown> | null = null;
  if (body.entityType && body.entityId) {
    let found: unknown = null;
    if (body.entityType === "matter") found = getMatter(body.entityId);
    else if (body.entityType === "lead") found = getLead(body.entityId);
    else if (body.entityType === "opportunity") found = getOpportunity(body.entityId);
    else if (body.entityType === "account") found = getAccount(body.entityId);
    entity = (found as Record<string, unknown> | undefined) ?? null;
    if (!entity) return { error: "Registro não encontrado", status: 404 };
  } else if (body.task !== "draft_notes") {
    return { error: "entityType e entityId são obrigatórios para esta tarefa", status: 400 };
  }

  const name = String(entity?.title ?? entity?.name ?? "registro");
  const base: Omit<AiAssistResponse, "title" | "content" | "bullets"> = {
    task: body.task,
    simulated: true,
    disclaimer: AI_ASSIST_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };

  switch (body.task) {
    case "summarize_matter":
      return {
        ...base,
        title: `Resumo — ${name}`,
        content: `Resumo determinístico (modo offline) da demanda "${name}". Configure um provedor de IA para análise completa baseada no conteúdo do registro.`,
        bullets: [
          `Status: ${entity?.status ?? "não informado"}`,
          `Risco: ${entity?.risk ?? "não informado"}`,
          `Prazo: ${entity?.deadline ?? "não informado"}`,
          `Responsável: ${entity?.owner ?? "não informado"}`,
        ],
      };
    case "draft_notes":
      return {
        ...base,
        title: `Rascunho de notas — ${name}`,
        content: `Rascunho determinístico (modo offline) para "${name}". ${body.context ? `Contexto: ${body.context}` : "Sem contexto adicional fornecido."}`,
        bullets: ["Confirmar fatos do registro", "Revisar e completar antes de salvar"],
      };
    case "enrich_lead":
      return {
        ...base,
        title: `Enriquecimento — ${name}`,
        content: `Análise determinística (modo offline) do lead "${name}". Configure a IA para leitura estratégica completa.`,
        bullets: [
          `Região: ${entity?.region ?? "não informado"}`,
          `Cultura: ${entity?.crop ?? "não informado"}`,
          `Dor jurídica: ${entity?.legalPain ?? "a coletar"}`,
        ],
      };
    case "next_steps":
      return {
        ...base,
        title: `Próximos passos — ${name}`,
        content: `Plano determinístico (modo offline) para "${name}". Configure a IA para recomendações contextualizadas.`,
        bullets: [
          "Revisar pendências do registro",
          "Definir responsável e prazo da próxima ação",
          "Registrar atualização no histórico",
        ],
      };
    default:
      return { error: "task inválido", status: 400 };
  }
}

export async function handleLocalApi(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; data: unknown }> {
  const { pathname, params } = parseQuery(path);

  if (pathname === "/api/auth/login" && init?.method === "POST") {
    const body = JSON.parse(String(init.body));
    const result = authenticate(body.email, body.password);
    if (!result) return { status: 401, data: { error: "Credenciais inválidas" } };
    writeMockSession(result.token);
    return { status: 200, data: result };
  }

  const token = readMockSession();

  if (pathname === "/api/auth/me") {
    const user = resolveSession(token);
    if (!user) return { status: 401, data: { error: "Não autenticado" } };
    return { status: 200, data: user };
  }

  if (pathname === "/api/auth/logout" && init?.method === "POST") {
    writeMockSession(null);
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

      if (params.get("action") === "import" || body.action === "import") {
        const rawRows: Record<string, unknown>[] = Array.isArray(body.leads) ? body.leads : [];
        if (!rawRows.length) return { status: 400, data: { error: "Nenhum lead para importar" } };
        if (rawRows.length > 2000) {
          return { status: 400, data: { error: "Máximo de 2000 leads por importação" } };
        }
        const listId = body.listId != null ? String(body.listId) : null;
        const importToday = new Date().toISOString().slice(0, 10);
        const errors: { row: number; error: string }[] = [];
        let imported = 0;
        rawRows.forEach((raw, i) => {
          const name = raw.name != null ? String(raw.name).trim() : "";
          const region = raw.region != null ? String(raw.region).trim() : "";
          if (!name) { errors.push({ row: i + 1, error: "name é obrigatório" }); return; }
          if (!region) { errors.push({ row: i + 1, error: "region é obrigatório" }); return; }
          const id = `LD-${String(listLeads().length + 1).padStart(3, "0")}`;
          addLead({
            id,
            name,
            contact: raw.contact != null ? String(raw.contact) : "",
            region,
            crop: raw.crop != null ? String(raw.crop) : "",
            source: raw.source != null ? String(raw.source) : "Importação",
            status: "novo",
            owner: raw.owner != null ? String(raw.owner) : user.name,
            notes: raw.notes != null ? String(raw.notes) : "",
            nextContact: null,
            accountId: null,
            createdAt: importToday,
            phone: raw.phone != null ? String(raw.phone) : undefined,
            email: raw.email != null ? String(raw.email) : undefined,
            cnpj: raw.cnpj != null ? String(raw.cnpj) : undefined,
            cpf: raw.cpf != null ? String(raw.cpf) : undefined,
            address: raw.address != null ? String(raw.address) : undefined,
            listId: listId ?? (raw.listId != null ? String(raw.listId) : null),
          });
          imported += 1;
        });
        return { status: 201, data: { imported, failed: errors.length, errors } };
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
        phone: body.phone,
        email: body.email,
        cnpj: body.cnpj,
        cpf: body.cpf,
        address: body.address,
        listId: body.listId ?? null,
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
    const result = paginate(sortItems(filterLeads(all, query), query, LEAD_SORT), query);
    if (query.facets) result.facets = buildLeadFacets(all);
    return { status: 200, data: result };
  }

  if (pathname === "/api/agro/lead-lists") {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      if (!body.name) return { status: 400, data: { error: "name é obrigatório" } };
      const id = `LL-${String(listLeadLists().length + 1).padStart(3, "0")}`;
      const list: LeadList = {
        id,
        name: body.name,
        description: body.description,
        owner: user.name,
        createdAt: new Date().toISOString(),
        leadCount: 0,
      };
      addLeadList(list);
      return { status: 201, data: getLeadList(id) ?? list };
    }

    if (init?.method === "PATCH") {
      const id = params.get("id");
      if (!id) return { status: 400, data: { error: "id é obrigatório" } };
      const body = JSON.parse(String(init.body));
      const list = patchLeadList(id, body);
      return list
        ? { status: 200, data: list }
        : { status: 404, data: { error: "Lista não encontrada" } };
    }

    if (init?.method === "DELETE") {
      const id = params.get("id");
      if (!id) return { status: 400, data: { error: "id é obrigatório" } };
      for (const lead of listLeads()) {
        if (lead.listId === id) patchLead(lead.id, { listId: null });
      }
      const ok = patchLeadList(id, { deletedAt: new Date().toISOString() });
      return ok
        ? { status: 200, data: { ok: true } }
        : { status: 404, data: { error: "Lista não encontrada" } };
    }

    const id = params.get("id");
    if (id) {
      const list = getLeadList(id);
      return list
        ? { status: 200, data: list }
        : { status: 404, data: { error: "Lista não encontrada" } };
    }
    return { status: 200, data: listLeadLists() };
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
    const result = paginate(sortItems(filterAccounts(all, query), query, ACCOUNT_SORT), query);
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
    const result = paginate(sortItems(filterOpportunities(all, query), query, OPPORTUNITY_SORT), query);
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
    const result = paginate(sortItems(filterMatters(all, query), query, MATTER_SORT), query);
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
    const result = paginate(sortItems(filterTasks(all, query), query, TASK_SORT), query);
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

  if (pathname === "/api/agro/timeseries") {
    return { status: 200, data: computeCrmTimeseries() };
  }

  if (pathname === "/api/agro/copilot" && init?.method === "POST") {
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

  if (pathname === "/api/agro/ai-assist" && init?.method === "POST") {
    const body = JSON.parse(String(init.body)) as AiAssistRequest;
    const data = resolveAiAssistMock(body);
    if ("error" in data) return { status: data.status, data: { error: data.error } };
    return { status: 200, data };
  }

  if (pathname === "/api/agro/users") {
    if (user.role !== "gestao") {
      return { status: 403, data: { error: "Apenas perfis de gestão" } };
    }
    const users = getMockUsers();
    const VALID_ROLES: AgroRole[] = ["gestao", "comercial", "juridico"];

    if (!init?.method || init.method === "GET") {
      const id = params.get("id") ?? undefined;
      if (id) {
        const found = users.find((u) => u.id === id);
        if (!found) return { status: 404, data: { error: "Usuário não encontrado" } };
        return { status: 200, data: found };
      }
      return { status: 200, data: users.map((u) => ({ ...u })) };
    }

    if (init.method === "POST") {
      const body = JSON.parse(String(init.body));
      const email = String(body.email ?? "").trim().toLowerCase();
      const name = String(body.name ?? "").trim();
      const role = body.role as AgroRole;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { status: 400, data: { error: "email inválido" } };
      }
      if (!name) return { status: 400, data: { error: "name é obrigatório" } };
      if (!VALID_ROLES.includes(role)) return { status: 400, data: { error: "role inválido" } };
      if (body.password !== undefined && body.password !== null && body.password !== "" &&
          String(body.password).length < 8) {
        return { status: 400, data: { error: "password deve ter ao menos 8 caracteres" } };
      }
      if (users.some((u) => u.email.toLowerCase() === email)) {
        return { status: 409, data: { error: "E-mail já cadastrado" } };
      }
      const created: ManagedUser = {
        id: `usr-${crypto.randomUUID().slice(0, 8)}`,
        email,
        name,
        role,
        active: body.active === undefined ? true : Boolean(body.active),
        hasPassword: Boolean(body.password),
      };
      users.push(created);
      return { status: 201, data: created };
    }

    const id = params.get("id") ?? undefined;
    if (!id) return { status: 400, data: { error: "id é obrigatório" } };
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return { status: 404, data: { error: "Usuário não encontrado" } };

    if (init.method === "PATCH") {
      const body = JSON.parse(String(init.body));

      if (params.get("action") === "password") {
        if (!body.password || String(body.password).length < 8) {
          return { status: 400, data: { error: "password deve ter ao menos 8 caracteres" } };
        }
        users[idx] = { ...users[idx], hasPassword: true };
        return { status: 200, data: { ok: true } };
      }

      const role = body.role !== undefined ? (body.role as AgroRole) : undefined;
      if (role !== undefined && !VALID_ROLES.includes(role)) {
        return { status: 400, data: { error: "role inválido" } };
      }
      const target = users[idx];
      const losingGestao =
        target.role === "gestao" &&
        ((body.active === false) || (role !== undefined && role !== "gestao"));
      const activeGestao = users.filter((u) => u.role === "gestao" && u.active).length;
      if (losingGestao && target.active && activeGestao <= 1) {
        return { status: 409, data: { error: "Não é possível desativar ou rebaixar o último gestor ativo" } };
      }
      users[idx] = {
        ...target,
        ...(body.name !== undefined ? { name: String(body.name) } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
      };
      return { status: 200, data: users[idx] };
    }

    return { status: 405, data: { error: "Método não permitido" } };
  }

  if (pathname === "/api/agro/meetings") {
    const meetings = getMockMeetings();
    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

    if (!init?.method || init.method === "GET") {
      const id = params.get("id") ?? undefined;
      if (id) {
        const found = meetings.find((m) => m.id === id);
        if (!found) return { status: 404, data: { error: "Reunião não encontrada" } };
        return { status: 200, data: found };
      }
      const sorted = [...meetings].sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : (a.time ?? "").localeCompare(b.time ?? "");
      });
      return { status: 200, data: sorted };
    }

    if (init.method === "POST") {
      const body = JSON.parse(String(init.body));
      const title = String(body.title ?? "").trim();
      if (!title) return { status: 400, data: { error: "title é obrigatório" } };
      const date = String(body.date ?? "");
      if (!ISO_DATE_RE.test(date)) return { status: 400, data: { error: "date deve usar YYYY-MM-DD" } };
      let time: string | null = null;
      if (body.time !== undefined && body.time !== null && body.time !== "") {
        const t = String(body.time);
        if (!TIME_RE.test(t)) return { status: 400, data: { error: "time deve usar HH:MM" } };
        time = t;
      }
      const now = new Date().toISOString();
      const created: Meeting = {
        id: `mtg-${crypto.randomUUID().slice(0, 12)}`,
        title,
        date,
        time,
        location: body.location != null && String(body.location).trim() !== "" ? String(body.location) : null,
        description: body.description != null && String(body.description).trim() !== "" ? String(body.description) : null,
        createdBy: user.id,
        createdByName: user.name,
        createdAt: now,
        updatedAt: now,
      };
      meetings.push(created);
      return { status: 201, data: created };
    }

    if (init.method === "DELETE") {
      const id = params.get("id") ?? undefined;
      if (!id) return { status: 400, data: { error: "id é obrigatório" } };
      const idx = meetings.findIndex((m) => m.id === id);
      if (idx < 0) return { status: 404, data: { error: "Reunião não encontrada" } };
      meetings.splice(idx, 1);
      return { status: 200, data: { ok: true } };
    }

    return { status: 405, data: { error: "Método não permitido" } };
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

    if (init.method === "POST" && params.get("action") === "reindex-embeddings") {
      // Mock sem DB: embeddings vivem em cache de memória, nada a persistir.
      return {
        status: 200,
        data: {
          total: docs.length,
          pending: 0,
          seeded: 0,
          remaining: 0,
          done: true,
          skipped: true,
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
        tribunal: body.tribunal != null ? String(body.tribunal) : undefined,
        relator: body.relator != null ? String(body.relator) : undefined,
        dataJulgamento:
          body.dataJulgamento != null ? String(body.dataJulgamento) : undefined,
        numeroProcesso:
          body.numeroProcesso != null ? String(body.numeroProcesso) : undefined,
        ementa: body.ementa != null ? String(body.ementa) : undefined,
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
        ...(body.tribunal !== undefined
          ? { tribunal: body.tribunal != null ? String(body.tribunal) : undefined }
          : {}),
        ...(body.relator !== undefined
          ? { relator: body.relator != null ? String(body.relator) : undefined }
          : {}),
        ...(body.dataJulgamento !== undefined
          ? {
              dataJulgamento:
                body.dataJulgamento != null ? String(body.dataJulgamento) : undefined,
            }
          : {}),
        ...(body.numeroProcesso !== undefined
          ? {
              numeroProcesso:
                body.numeroProcesso != null ? String(body.numeroProcesso) : undefined,
            }
          : {}),
        ...(body.ementa !== undefined
          ? { ementa: body.ementa != null ? String(body.ementa) : undefined }
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
