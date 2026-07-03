import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { DeadlineType } from "@shared/agro/types";
import { crmKeys } from "./query-keys";

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
