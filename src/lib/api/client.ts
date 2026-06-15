import { handleLocalApi } from "./local-handlers";
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (shouldUseLocalApi()) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
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

export const agroApi = {
  login: (email: string, password: string) =>
    request<{ token?: string; user: import("@shared/agro/types").AgroUser }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ).then((res) => {
      clearLegacyAuthToken();
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

  dbHealth: () =>
    request<{ mode: string; connected: boolean }>("/api/health/db"),
};
