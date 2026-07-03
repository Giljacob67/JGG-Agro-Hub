import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { ActivityEntityType, ActivityType } from "@shared/agro/types";
import { crmKeys } from "./query-keys";

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
