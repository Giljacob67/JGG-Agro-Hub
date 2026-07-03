import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { OpportunityListParams } from "@shared/agro/list-types";
import type { OpportunityPriority, OpportunityStage } from "@shared/agro/types";
import { crmKeys } from "./query-keys";

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
