import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { LeadListParams } from "@shared/agro/list-types";
import type { LeadStatus } from "@shared/agro/types";
import { crmKeys } from "./query-keys";

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

export function useImportLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agroApi.importLeads,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leads });
      qc.invalidateQueries({ queryKey: crmKeys.leadLists });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
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
