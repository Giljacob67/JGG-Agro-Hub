import { buildQuery } from "./build-query";
import type {
  AccountListParams,
  LeadListParams,
  MatterListParams,
  OpportunityListParams,
  PaginatedResult,
  TaskListParams,
} from "@shared/agro/list-types";

const TOKEN_KEY = "agro_auth_token";

/** @deprecated tokens agora são gerenciados pelo backend via cookie HttpOnly. */
export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/** @deprecated tokens agora são gerenciados pelo backend via cookie HttpOnly. */
export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Limpa qualquer token legado do localStorage. */
export function clearLegacyAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function shouldUseLocalApi() {
  return import.meta.env.DEV && import.meta.env.VITE_USE_API !== "true";
}

// CSRF token management.
// O token vem no body do /login (password) ou, para SSO e após reload,
// é lido do cookie CSRF (não-HttpOnly) que o backend ecoa no header.
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)(?:__Host-)?agro_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getCsrfToken(): string | null {
  return csrfToken ?? readCsrfCookie();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() || "GET";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  // Add CSRF token for write requests
  if (method !== "GET" && method !== "OPTIONS" && method !== "HEAD") {
    const token = getCsrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }

  if (shouldUseLocalApi()) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const { handleLocalApi } = await import("./local-handlers");
    const { status, data } = await handleLocalApi(path, { ...init, headers });
    if (status >= 400) {
      throw new ApiError(status, (data as { error?: string }).error ?? "Erro na API");
    }
    return data as T;
  }

  const res = await fetch(path, { ...init, headers, credentials: "include" });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? "Erro na API");
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Requisição direta a um endpoint serverless real (sem roteamento p/ mock local).
 * Usada por upload R2 e extração de texto da base de conhecimento, que não têm
 * equivalente no handler local. Inclui CSRF + cookie de sessão.
 */
async function directApi<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getCsrfToken();
  if (token) headers["X-CSRF-Token"] = token;
  if (shouldUseLocalApi()) {
    const legacy = getAuthToken();
    if (legacy) headers.Authorization = `Bearer ${legacy}`;
  }
  const res = await fetch(path, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? "Erro na API");
  }
  return data as T;
}

export const agroApi = {
  login: (email: string, password: string) =>
    request<{ token?: string; user: import("@shared/agro/types").AgroUser; csrfToken?: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ).then((res) => {
      clearLegacyAuthToken();
      if (res.csrfToken) setCsrfToken(res.csrfToken);
      return res;
    }),

  me: () => request<import("@shared/agro/types").AgroUser>("/api/auth/me"),

  logout: () =>
    request<{ ok: true }>("/api/auth/logout", {
      method: "POST",
    }).then((res) => {
      clearLegacyAuthToken();
      return res;
    }),

  leads: (params: LeadListParams = {}) =>
    request<PaginatedResult<import("@shared/agro/types").Lead>>(
      `/api/agro/leads${buildQuery({
        facets: params.facets ?? true,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 100,
        search: params.search,
        status: params.status,
        region: params.region,
        source: params.source,
        crop: params.crop,
        owner: params.owner,
      })}`,
    ),

  lead: (id: string) =>
    request<import("@shared/agro/types").Lead>(`/api/agro/leads?id=${id}`),

  accounts: (params: AccountListParams = {}) =>
    request<PaginatedResult<import("@shared/agro/types").Account>>(
      `/api/agro/accounts${buildQuery({
        facets: params.facets ?? true,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 100,
        search: params.search,
        type: params.type,
        region: params.region,
        owner: params.owner,
      })}`,
    ),

  account: (id: string) =>
    request<import("@shared/agro/types").Account>(`/api/agro/accounts?id=${id}`),
  accountTimeline: (id: string) =>
    request<{
      account: import("@shared/agro/types").Account;
      timeline: ReturnType<
        typeof import("@shared/agro/store").getAccountTimeline
      >;
    }>(`/api/agro/accounts?id=${id}&timeline=1`),

  opportunities: (params: OpportunityListParams = {}) =>
    request<PaginatedResult<import("@shared/agro/types").Opportunity>>(
      `/api/agro/opportunities${buildQuery({
        facets: params.facets ?? true,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 100,
        search: params.search,
        stage: params.stage,
        practice: params.practice,
        owner: params.owner,
        priority: params.priority,
        valueRange: params.valueRange,
      })}`,
    ),

  opportunity: (id: string) =>
    request<import("@shared/agro/types").Opportunity>(
      `/api/agro/opportunities?id=${id}`,
    ),

  matters: (params: MatterListParams = {}) =>
    request<PaginatedResult<import("@shared/agro/types").Matter>>(
      `/api/agro/matters${buildQuery({
        facets: params.facets ?? true,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 100,
        search: params.search,
        status: params.status,
        risk: params.risk,
        practice: params.practice,
        owner: params.owner,
        deadline: params.deadline,
      })}`,
    ),

  matter: (id: string) =>
    request<import("@shared/agro/types").Matter>(`/api/agro/matters?id=${id}`),

  mattersByOpportunity: (opportunityId: string) =>
    request<import("@shared/agro/types").Matter[]>(
      `/api/agro/matters?opportunityId=${opportunityId}`,
    ),

  deadlines: (matterId?: string) =>
    request<import("@shared/agro/types").Deadline[]>(
      `/api/agro/deadlines${matterId ? `?matterId=${matterId}` : ""}`,
    ),

  createDeadline: (input: {
    matterId: string;
    title: string;
    type: import("@shared/agro/types").DeadlineType;
    dueDate: string;
    owner: string;
    notes?: string;
  }) =>
    request<import("@shared/agro/types").Deadline>("/api/agro/deadlines", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateDeadline: (
    id: string,
    patch: Partial<
      Pick<
        import("@shared/agro/types").Deadline,
        "status" | "dueDate" | "completedAt" | "owner" | "notes"
      >
    >,
  ) =>
    request<import("@shared/agro/types").Deadline>(
      `/api/agro/deadlines?id=${id}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    ),

  activities: (
    entityId?: string,
    entityType?: import("@shared/agro/types").ActivityEntityType,
  ) =>
    request<import("@shared/agro/types").Activity[]>(
      `/api/agro/activities${buildQuery({ entityId, entityType })}`,
    ),

  createActivity: (input: {
    entityType: import("@shared/agro/types").ActivityEntityType;
    entityId: string;
    type: import("@shared/agro/types").ActivityType;
    summary: string;
    date?: string;
    owner: string;
  }) =>
    request<import("@shared/agro/types").Activity>("/api/agro/activities", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  convertLead: (
    id: string,
    input: {
      title?: string;
      valueBrl?: number;
      practice?: string;
      owner?: string;
      expectedClose?: string;
    } = {},
  ) =>
    request<{
      ok: true;
      lead: import("@shared/agro/types").Lead;
      opportunity: import("@shared/agro/types").Opportunity;
    }>(`/api/agro/leads?id=${id}&action=convert`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  tasks: (params: TaskListParams = {}) =>
    request<PaginatedResult<import("@shared/agro/types").Task>>(
      `/api/agro/tasks${buildQuery({
        facets: params.facets ?? true,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 100,
        search: params.search,
        status: params.status,
        priority: params.priority,
        owner: params.owner,
        type: params.type,
        due: params.due,
      })}`,
    ),

  tasksByRelated: (relatedTo: string) =>
    request<import("@shared/agro/types").Task[]>(
      `/api/agro/tasks?relatedTo=${relatedTo}`,
    ),

  stats: () => request<import("@shared/agro/types").CrmStats>("/api/agro/stats"),

  updateLead: (
    id: string,
    patch: Partial<
      Pick<
        import("@shared/agro/types").Lead,
        "status" | "owner" | "nextContact" | "notes" | "name"
      >
    >,
  ) =>
    request<import("@shared/agro/types").Lead>(`/api/agro/leads?id=${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  createLead: (input: {
    name: string;
    contact?: string;
    region: string;
    crop?: string;
    source?: string;
    owner: string;
    notes?: string;
    nextContact?: string | null;
    accountId?: string | null;
    status?: import("@shared/agro/types").LeadStatus;
    leadType?: string;
    legalPain?: string;
    interestArea?: string;
    priority?: import("@shared/agro/types").LeadPriority;
  }) =>
    request<import("@shared/agro/types").Lead>("/api/agro/leads", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createAccount: (input: {
    name: string;
    type: string;
    region: string;
    crop?: string;
    owner: string;
    notes?: string;
  }) =>
    request<import("@shared/agro/types").Account>("/api/agro/accounts", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createOpportunity: (input: {
    title: string;
    clientName: string;
    region?: string;
    crop?: string;
    valueBrl?: number;
    owner: string;
    notes?: string;
  }) =>
    request<import("@shared/agro/types").Opportunity>("/api/agro/opportunities", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createMatter: (input: {
    title: string;
    clientName: string;
    cnjNumber?: string;
    court?: string;
    opposingParty?: string;
    phase?: string;
    risk?: string;
    valueBrl?: number;
    owner: string;
    notes?: string;
    opportunityId?: string;
    parentMatterId?: string;
    relationType?: string;
  }) =>
    request<import("@shared/agro/types").Matter>("/api/agro/matters", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createTask: (input: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    assignee: string;
  }) =>
    request<import("@shared/agro/types").Task>("/api/agro/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateTaskStatus: (id: string, status: import("@shared/agro/types").TaskStatus) =>
    request<import("@shared/agro/types").Task>(`/api/agro/tasks?id=${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  updateOpportunity: (
    id: string,
    patch: Partial<
      Pick<
        import("@shared/agro/types").Opportunity,
        "stage" | "priority" | "nextContact"
      >
    >,
  ) =>
    request<import("@shared/agro/types").Opportunity>(
      `/api/agro/opportunities?id=${id}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    ),

  updateMatter: (
    id: string,
    patch: Partial<{
      status: import("@shared/agro/types").MatterStatus;
      risk: import("@shared/agro/types").RiskLevel;
      cnjNumber: string | null;
      court: string | null;
      phase: import("@shared/agro/types").MatterPhase | null;
      opposingParty: string | null;
      claimValueBrl: number | null;
      opportunityId: string | null;
      nextSteps: string | null;
    }>,
  ) =>
    request<import("@shared/agro/types").Matter>(`/api/agro/matters?id=${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  copilotQuery: (input: import("@shared/agro/types").CopilotQueryRequest) =>
    request<import("@shared/agro/types").CopilotResponse>(
      "/api/agro/copilot/query",
      { method: "POST", body: JSON.stringify(input) },
    ),

  knowledge: (categoryId?: string) =>
    request<import("@shared/agro/types").KnowledgeListResponse>(
      `/api/agro/knowledge${categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ""}`,
    ),

  createKnowledgeDocument: (
    input: import("@shared/agro/types").KnowledgeDocumentInput,
  ) =>
    request<import("@shared/agro/types").KnowledgeDocument>("/api/agro/knowledge", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateKnowledgeDocument: (
    id: string,
    input: Partial<import("@shared/agro/types").KnowledgeDocumentInput>,
  ) =>
    request<import("@shared/agro/types").KnowledgeDocument>(
      `/api/agro/knowledge?id=${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),

  deleteKnowledgeDocument: (id: string) =>
    request<{ ok: true }>(`/api/agro/knowledge?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  /** Gera URL presignada R2 para upload direto do arquivo (anexo da base). */
  presignKnowledgeUpload: (fileName: string, contentType: string) =>
    directApi<{ uploadUrl: string; fileUrl: string; key: string }>("/api/upload", {
      fileName,
      contentType,
      prefix: "knowledge",
    }),

  /** Extrai texto (server-side) de um arquivo já enviado ao R2. */
  extractKnowledgeDocument: (fileUrl: string, contentType: string, fileName: string) =>
    directApi<{ text: string; chars: number; truncated: boolean }>("/api/upload", {
      op: "extract",
      fileUrl,
      contentType,
      fileName,
    }),

  getCopilotConfig: () =>
    request<import("@shared/agro/types").CopilotConfigStatus>(
      "/api/agro/copilot-config",
    ),

  updateCopilotConfig: (input: {
    provider: string;
    model: string;
    temperature?: number;
  }) =>
    request<import("@shared/agro/types").CopilotConfigStatus>(
      "/api/agro/copilot-config",
      { method: "PATCH", body: JSON.stringify(input) },
    ),

  dbHealth: () =>
    request<{ mode: string; connected: boolean }>("/api/health/db"),

  audit: (params: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  } = {}) =>
    request<{
      items: Array<{
        id: string;
        entityType: string;
        entityId: string;
        action: string;
        userId: string;
        userName: string;
        timestamp: string;
        before: Record<string, unknown> | null;
        after: Record<string, unknown> | null;
        ip?: string;
      }>;
      total: number;
      limit: number;
      offset: number;
    }>(`/api/agro/audit${buildQuery(params)}`),

  auditStats: () =>
    request<{
      totalLogs: number;
      byEntityType: Record<string, number>;
      byAction: Record<string, number>;
    }>("/api/agro/audit?action=stats"),

  lookupCnpj: (cnpj: string) =>
    request<{
      cnpj: string;
      razaoSocial: string;
      nomeFantasia?: string;
      situacao: string;
      porte?: string;
      naturezaJuridica?: string;
      endereco?: string;
      bairro?: string;
      municipio?: string;
      uf?: string;
      cep?: string;
      telefone?: string;
      email?: string;
      capitalSocial?: number;
      dataAbertura?: string;
      atividadePrincipal?: string;
      source: string;
    }>(`/api/agro/lookup?type=cnpj&document=${encodeURIComponent(cnpj)}`),

  lookupCpf: (cpf: string) =>
    request<{
      cpf: string;
      nome: string;
      Situacao: string;
    }>(`/api/agro/lookup?type=cpf&document=${encodeURIComponent(cpf)}`),

  // ── Documents ────────────────────────────────────────────────────

  listDocuments: (params: { entityType?: string; entityId?: string; matterId?: string }) =>
    request<any[]>(`/api/agro/documents?${buildQuery(params)}`),

  createDocument: (input: Record<string, unknown>) =>
    request<any>("/api/agro/documents", { method: "POST", body: JSON.stringify(input) }),

  updateDocument: (id: string, patch: Record<string, unknown>) =>
    request<any>(`/api/agro/documents?id=${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteDocument: (id: string) =>
    request<any>(`/api/agro/documents?id=${id}`, { method: "DELETE" }),

  // ── Document Checklist ───────────────────────────────────────────

  listDocumentChecklist: (matterId: string) =>
    request<any[]>(`/api/agro/document-checklist?matterId=${matterId}`),

  createDocumentChecklistItem: (input: Record<string, unknown>) =>
    request<any>("/api/agro/document-checklist", { method: "POST", body: JSON.stringify(input) }),

  updateDocumentChecklistItem: (id: string, patch: Record<string, unknown>) =>
    request<any>(`/api/agro/document-checklist?id=${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteDocumentChecklistItem: (id: string) =>
    request<any>(`/api/agro/document-checklist?id=${id}`, { method: "DELETE" }),

  // ── Time Entries ─────────────────────────────────────────────────

  listTimeEntries: (params: { matterId?: string; owner?: string; invoiced?: boolean }) =>
    request<any[]>(`/api/agro/time-entries?${buildQuery(params)}`),

  createTimeEntry: (input: Record<string, unknown>) =>
    request<any>("/api/agro/time-entries", { method: "POST", body: JSON.stringify(input) }),

  updateTimeEntry: (id: string, patch: Record<string, unknown>) =>
    request<any>(`/api/agro/time-entries?id=${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteTimeEntry: (id: string) =>
    request<any>(`/api/agro/time-entries?id=${id}`, { method: "DELETE" }),

  // ── Invoices ─────────────────────────────────────────────────────

  listInvoices: (params: { accountId?: string; status?: string }) =>
    request<any[]>(`/api/agro/invoices?${buildQuery(params)}`),

  createInvoice: (input: Record<string, unknown>) =>
    request<any>("/api/agro/invoices", { method: "POST", body: JSON.stringify(input) }),

  updateInvoice: (id: string, patch: Record<string, unknown>) =>
    request<any>(`/api/agro/invoices?id=${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  // ── Fee Agreements ───────────────────────────────────────────────

  listFeeAgreements: (params: { accountId?: string; matterId?: string }) =>
    request<any[]>(`/api/agro/fee-agreements?${buildQuery(params)}`),

  createFeeAgreement: (input: Record<string, unknown>) =>
    request<any>("/api/agro/fee-agreements", { method: "POST", body: JSON.stringify(input) }),

  // ── Contacts ─────────────────────────────────────────────────────

  listContacts: (params: { accountId?: string }) =>
    request<any[]>(`/api/agro/contacts?${buildQuery(params)}`),

  createContact: (input: Record<string, unknown>) =>
    request<any>("/api/agro/contacts", { method: "POST", body: JSON.stringify(input) }),

  updateContact: (id: string, patch: Record<string, unknown>) =>
    request<any>(`/api/agro/contacts?id=${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteContact: (id: string) =>
    request<any>(`/api/agro/contacts?id=${id}`, { method: "DELETE" }),

  // ── Properties ───────────────────────────────────────────────────

  listProperties: (params: { accountId?: string }) =>
    request<any[]>(`/api/agro/properties?${buildQuery(params)}`),

  createProperty: (input: Record<string, unknown>) =>
    request<any>("/api/agro/properties", { method: "POST", body: JSON.stringify(input) }),

  updateProperty: (id: string, patch: Record<string, unknown>) =>
    request<any>(`/api/agro/properties?id=${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteProperty: (id: string) =>
    request<any>(`/api/agro/properties?id=${id}`, { method: "DELETE" }),

  // ── Opposing Parties ─────────────────────────────────────────────

  listOpposingParties: () =>
    request<any[]>("/api/agro/opposing-parties"),

  createOpposingParty: (input: Record<string, unknown>) =>
    request<any>("/api/agro/opposing-parties", { method: "POST", body: JSON.stringify(input) }),

  updateOpposingParty: (id: string, patch: Record<string, unknown>) =>
    request<any>(`/api/agro/opposing-parties?id=${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  // ── Conflict Check ───────────────────────────────────────────────

  checkConflict: (name: string) =>
    request<{ hasConflicts: boolean; conflicts: Array<{ type: string; entity: string; detail: string }> }>(
      `/api/agro/conflict-check?name=${encodeURIComponent(name)}`
    ),

  // ── Crop Seasons ──────────────────────────────────────────────────

  listCropSeasons: (params: { year?: number; region?: string }) =>
    request<any[]>(`/api/agro/crop-seasons?${buildQuery(params)}`),

  createCropSeason: (input: Record<string, unknown>) =>
    request<any>("/api/agro/crop-seasons", { method: "POST", body: JSON.stringify(input) }),

  // ── Tax Obligations ───────────────────────────────────────────────

  listTaxObligations: (params: { propertyId?: string; accountId?: string; year?: number }) =>
    request<any[]>(`/api/agro/tax-obligations?${buildQuery(params)}`),

  createTaxObligation: (input: Record<string, unknown>) =>
    request<any>("/api/agro/tax-obligations", { method: "POST", body: JSON.stringify(input) }),

  // ── Environmental Licenses ────────────────────────────────────────

  listEnvironmentalLicenses: (params: { propertyId?: string; accountId?: string }) =>
    request<any[]>(`/api/agro/environmental-licenses?${buildQuery(params)}`),

  createEnvironmentalLicense: (input: Record<string, unknown>) =>
    request<any>("/api/agro/environmental-licenses", { method: "POST", body: JSON.stringify(input) }),

  // ── Credit Instruments ────────────────────────────────────────────

  listCreditInstruments: (params: { accountId?: string; matterId?: string }) =>
    request<any[]>(`/api/agro/credit-instruments?${buildQuery(params)}`),

  createCreditInstrument: (input: Record<string, unknown>) =>
    request<any>("/api/agro/credit-instruments", { method: "POST", body: JSON.stringify(input) }),

  // ── CSV Export ──────────────────────────────────────────────────

  exportCsv: (resource: "leads" | "accounts" | "opportunities" | "matters" | "tasks") => {
    window.open(`/api/agro/${resource}?export=csv`, "_blank");
  },

  exportAuditCsv: () => {
    window.open("/api/agro/audit?action=export", "_blank");
  },
};
