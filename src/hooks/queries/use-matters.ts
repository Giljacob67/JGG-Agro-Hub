import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { MatterListParams } from "@shared/agro/list-types";
import type { MatterPhase, MatterStatus, RiskLevel } from "@shared/agro/types";
import { crmKeys } from "./query-keys";

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

export function useMattersByOpportunity(opportunityId: string) {
  return useQuery({
    queryKey: crmKeys.mattersByOpportunity(opportunityId),
    queryFn: () => agroApi.mattersByOpportunity(opportunityId),
    enabled: !!opportunityId,
  });
}

export function useAllMatters() {
  return useQuery({
    queryKey: crmKeys.matters,
    queryFn: () => agroApi.matters({}),
  });
}
