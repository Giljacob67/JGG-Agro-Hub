import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { AiAssistRequest, CopilotQueryRequest } from "@shared/agro/types";

export function useCopilotQuery() {
  return useMutation({
    mutationFn: (input: CopilotQueryRequest) => agroApi.copilotQuery(input),
  });
}

export function useAiAssist() {
  return useMutation({
    mutationFn: (input: AiAssistRequest) => agroApi.aiAssist(input),
  });
}

export function useCopilotConfig() {
  return useQuery({
    queryKey: ["copilot-config"],
    queryFn: () => agroApi.getCopilotConfig(),
  });
}

export function useUpdateCopilotConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { provider: string; model: string; temperature?: number }) =>
      agroApi.updateCopilotConfig(input),
    onSuccess: (data) => {
      queryClient.setQueryData(["copilot-config"], data);
    },
  });
}