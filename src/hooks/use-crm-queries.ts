import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type {
  AccountListParams,
  LeadListParams,
  MatterListParams,
  OpportunityListParams,
  TaskListParams,
} from "@shared/agro/list-types";
import type {
  ActivityEntityType,
  ActivityType,
  DeadlineType,
  MatterPhase,
  LeadStatus,
  MatterStatus,
  OpportunityPriority,
  OpportunityStage,
  RiskLevel,
  TaskStatus,
} from "@shared/agro/types";

export const crmKeys = {
  all: ["crm"] as const,
  leads: ["crm", "leads"] as const,
  lead: (id: string) => ["crm", "leads", id] as const,
  leadLists: ["crm", "lead-lists"] as const,
  accounts: ["crm", "accounts"] as const,
  account: (id: string) => ["crm", "accounts", id] as const,
  opportunities: ["crm", "opportunities"] as const,
  opportunity: (id: string) => ["crm", "opportunities", id] as const,
  matters: ["crm", "matters"] as const,
  matter: (id: string) => ["crm", "matters", id] as const,
  tasks: ["crm", "tasks"] as const,
  stats: ["crm", "stats"] as const,
  relatedTasks: (id: string) => ["crm", "tasks", "related", id] as const,
  deadlines: (matterId?: string) =>
    matterId
      ? (["crm", "deadlines", matterId] as const)
      : (["crm", "deadlines"] as const),
  activities: (entityId?: string) =>
    entityId
      ? (["crm", "activities", entityId] as const)
      : (["crm", "activities"] as const),
  mattersByOpportunity: (opportunityId: string) =>
    ["crm", "matters", "by-opportunity", opportunityId] as const,
};

export function useLeads(params: LeadListParams = { facets: true }) {
  return useQuery({
    queryKey: [...crmKeys.leads, params],
    queryFn: () => agroApi.leads(params),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: crmKeys.lead(id),
    queryFn: () => agroApi.lead(id),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agroApi.createLead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leads });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useLeadLists() {
  return useQuery({
    queryKey: crmKeys.leadLists,
    queryFn: agroApi.leadLists,
  });
}

export function useCreateLeadList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agroApi.createLeadList,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leadLists });
    },
  });
}

export function useUpdateLeadList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{ name: string; description: string }>;
    }) => agroApi.updateLeadList(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leadLists });
    },
  });
}

export function useDeleteLeadList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agroApi.deleteLeadList(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leadLists });
      qc.invalidateQueries({ queryKey: crmKeys.leads });
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agroApi.createAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.accounts });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useAccounts(params: AccountListParams = { facets: true }) {
  return useQuery({
    queryKey: [...crmKeys.accounts, params],
    queryFn: () => agroApi.accounts(params),
  });
}

export function useAccountTimeline(id: string) {
  return useQuery({
    queryKey: [...crmKeys.account(id), "timeline"],
    queryFn: () => agroApi.accountTimeline(id),
    enabled: !!id,
  });
}

export function useOpportunities(params: OpportunityListParams = { facets: true }) {
  return useQuery({
    queryKey: [...crmKeys.opportunities, params],
    queryFn: () => agroApi.opportunities(params),
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: crmKeys.opportunity(id),
    queryFn: () => agroApi.opportunity(id),
    enabled: !!id,
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agroApi.createOpportunity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.opportunities });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useMatters(params: MatterListParams = { facets: true }) {
  return useQuery({
    queryKey: [...crmKeys.matters, params],
    queryFn: () => agroApi.matters(params),
  });
}

export function useMatter(id: string) {
  return useQuery({
    queryKey: crmKeys.matter(id),
    queryFn: () => agroApi.matter(id),
    enabled: !!id,
  });
}

export function useCreateMatter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agroApi.createMatter,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.matters });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useTasks(params: TaskListParams = { facets: true }) {
  return useQuery({
    queryKey: [...crmKeys.tasks, params],
    queryFn: () => agroApi.tasks(params),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agroApi.createTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.tasks });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useRelatedTasks(entityId: string) {
  return useQuery({
    queryKey: crmKeys.relatedTasks(entityId),
    queryFn: () => agroApi.tasksByRelated(entityId),
    enabled: !!entityId,
  });
}

export function useCrmStats() {
  return useQuery({ queryKey: crmKeys.stats, queryFn: agroApi.stats });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        status: LeadStatus;
        owner: string;
        nextContact: string | null;
        notes: string;
        name: string;
      }>;
    }) => agroApi.updateLead(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: crmKeys.leads });
      qc.invalidateQueries({ queryKey: crmKeys.lead(id) });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useUpdateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        stage: OpportunityStage;
        priority: OpportunityPriority;
        nextContact: string | null;
      }>;
    }) => agroApi.updateOpportunity(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: crmKeys.opportunities });
      qc.invalidateQueries({ queryKey: crmKeys.opportunity(id) });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useUpdateMatter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        status: MatterStatus;
        risk: RiskLevel;
        cnjNumber: string | null;
        court: string | null;
        phase: MatterPhase | null;
        opposingParty: string | null;
        claimValueBrl: number | null;
        opportunityId: string | null;
        nextSteps: string | null;
      }>;
    }) => agroApi.updateMatter(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: crmKeys.matters });
      qc.invalidateQueries({ queryKey: crmKeys.matter(id) });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      agroApi.updateTaskStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.tasks });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

/* ---------------------------------------------------------------- Prazos */

export function useDeadlines(matterId?: string) {
  return useQuery({
    queryKey: crmKeys.deadlines(matterId),
    queryFn: () => agroApi.deadlines(matterId),
  });
}

export function useCreateDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      matterId: string;
      title: string;
      type: DeadlineType;
      dueDate: string;
      owner: string;
      notes?: string;
    }) => agroApi.createDeadline(input),
    onSuccess: (_, { matterId }) => {
      qc.invalidateQueries({ queryKey: crmKeys.deadlines(matterId) });
      qc.invalidateQueries({ queryKey: crmKeys.deadlines() });
    },
  });
}

export function useUpdateDeadline(matterId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        status: "pendente" | "cumprido" | "cancelado";
        dueDate: string;
        completedAt: string | null;
        owner: string;
        notes: string;
      }>;
    }) => agroApi.updateDeadline(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.deadlines(matterId) });
      qc.invalidateQueries({ queryKey: crmKeys.deadlines() });
    },
  });
}

/* ------------------------------------------------------------ Interações */

export function useActivities(entityId?: string, entityType?: ActivityEntityType) {
  return useQuery({
    queryKey: [...crmKeys.activities(entityId), entityType ?? "any"],
    queryFn: () => agroApi.activities(entityId, entityType),
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      entityType: ActivityEntityType;
      entityId: string;
      type: ActivityType;
      summary: string;
      date?: string;
      owner: string;
    }) => agroApi.createActivity(input),
    onSuccess: (_, { entityId }) => {
      qc.invalidateQueries({ queryKey: crmKeys.activities(entityId) });
      qc.invalidateQueries({ queryKey: crmKeys.activities() });
    },
  });
}

/* -------------------------------------------------- Conversão e vínculos */

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: {
        title?: string;
        valueBrl?: number;
        practice?: string;
        owner?: string;
        expectedClose?: string;
      };
    }) => agroApi.convertLead(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: crmKeys.leads });
      qc.invalidateQueries({ queryKey: crmKeys.lead(id) });
      qc.invalidateQueries({ queryKey: crmKeys.opportunities });
      qc.invalidateQueries({ queryKey: crmKeys.activities() });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useMattersByOpportunity(opportunityId: string) {
  return useQuery({
    queryKey: crmKeys.mattersByOpportunity(opportunityId),
    queryFn: () => agroApi.mattersByOpportunity(opportunityId),
    enabled: !!opportunityId,
  });
}

/* --------------------------------------------------------------- Auditoria */

export const auditKeys = {
  all: ["audit"] as const,
  list: (params: Record<string, unknown>) => ["audit", "list", params] as const,
  stats: ["audit", "stats"] as const,
};

export function useAuditLogs(params: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
} = {}) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => agroApi.audit(params),
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: auditKeys.stats,
    queryFn: agroApi.auditStats,
  });
}

/* ----------------------------------------------------------------- Lookup */

export function useLookupCnpj(cnpj: string, enabled = false) {
  return useQuery({
    queryKey: ["lookup", "cnpj", cnpj],
    queryFn: () => agroApi.lookupCnpj(cnpj),
    enabled,
  });
}

export function useLookupCpf(cpf: string, enabled = false) {
  return useQuery({
    queryKey: ["lookup", "cpf", cpf],
    queryFn: () => agroApi.lookupCpf(cpf),
    enabled,
  });
}

/* ---------------------------------------------------------- All / Report */

export function useAllMatters() {
  return useQuery({
    queryKey: crmKeys.matters,
    queryFn: () => agroApi.matters({}),
  });
}

export function useAllAccounts() {
  return useQuery({
    queryKey: crmKeys.accounts,
    queryFn: () => agroApi.accounts({}),
  });
}

export function useTimeEntries() {
  return useQuery({
    queryKey: ["crm", "timeEntries"],
    queryFn: () => agroApi.listTimeEntries({}),
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["crm", "invoices"],
    queryFn: () => agroApi.listInvoices({}),
  });
}

export function useContacts() {
  return useQuery({
    queryKey: ["crm", "contacts"],
    queryFn: () => agroApi.listContacts({}),
  });
}

export function useProperties() {
  return useQuery({
    queryKey: ["crm", "properties"],
    queryFn: () => agroApi.listProperties({}),
  });
}
