import { useQuery } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";

export const crmKeys = {
  all: ["crm"] as const,
  leads: ["crm", "leads"] as const,
  lead: (id: string) => ["crm", "leads", id] as const,
  accounts: ["crm", "accounts"] as const,
  account: (id: string) => ["crm", "accounts", id] as const,
  opportunities: ["crm", "opportunities"] as const,
  matters: ["crm", "matters"] as const,
  tasks: ["crm", "tasks"] as const,
  stats: ["crm", "stats"] as const,
  relatedTasks: (id: string) => ["crm", "tasks", "related", id] as const,
};

export function useLeads() {
  return useQuery({ queryKey: crmKeys.leads, queryFn: agroApi.leads });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: crmKeys.lead(id),
    queryFn: () => agroApi.lead(id),
    enabled: !!id,
  });
}

export function useAccounts() {
  return useQuery({ queryKey: crmKeys.accounts, queryFn: agroApi.accounts });
}

export function useAccountTimeline(id: string) {
  return useQuery({
    queryKey: [...crmKeys.account(id), "timeline"],
    queryFn: () => agroApi.accountTimeline(id),
    enabled: !!id,
  });
}

export function useOpportunities() {
  return useQuery({
    queryKey: crmKeys.opportunities,
    queryFn: agroApi.opportunities,
  });
}

export function useMatters() {
  return useQuery({ queryKey: crmKeys.matters, queryFn: agroApi.matters });
}

export function useTasks() {
  return useQuery({ queryKey: crmKeys.tasks, queryFn: agroApi.tasks });
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