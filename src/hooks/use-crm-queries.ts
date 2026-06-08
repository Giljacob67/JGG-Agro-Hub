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
  accounts: ["crm", "accounts"] as const,
  account: (id: string) => ["crm", "accounts", id] as const,
  opportunities: ["crm", "opportunities"] as const,
  opportunity: (id: string) => ["crm", "opportunities", id] as const,
  matters: ["crm", "matters"] as const,
  matter: (id: string) => ["crm", "matters", id] as const,
  tasks: ["crm", "tasks"] as const,
  stats: ["crm", "stats"] as const,
  relatedTasks: (id: string) => ["crm", "tasks", "related", id] as const,
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

export function useTasks(params: TaskListParams = { facets: true }) {
  return useQuery({
    queryKey: [...crmKeys.tasks, params],
    queryFn: () => agroApi.tasks(params),
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
      patch: Partial<{ status: MatterStatus; risk: RiskLevel }>;
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