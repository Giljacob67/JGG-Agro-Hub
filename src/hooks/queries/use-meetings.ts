import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import { crmKeys } from "./query-keys";

export function useMeetings() {
  return useQuery({
    queryKey: crmKeys.meetings,
    queryFn: () => agroApi.meetings(),
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      date: string;
      time?: string | null;
      location?: string | null;
      description?: string | null;
    }) => agroApi.createMeeting(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.meetings }),
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agroApi.deleteMeeting(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.meetings }),
  });
}
