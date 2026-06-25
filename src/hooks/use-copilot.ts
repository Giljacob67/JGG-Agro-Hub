import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { AiAssistRequest, CopilotQueryRequest } from "@shared/agro/types";

export function useCopilotQuery() {
  return useMutation({
    mutationFn: (input: CopilotQueryRequest) => agroApi.copilotQuery(input),
  });
}

/**
 * Apoio por IA cacheado por (task, entidade). `enabled` controla disparo
 * automático; chamada manual usa `refetch`. staleTime alto evita recompra
 * de LLM a cada abertura do detalhe.
 */
export function useAiAssist(input: AiAssistRequest, enabled: boolean) {
  return useQuery({
    queryKey: ["ai-assist", input.task, input.entityType ?? null, input.entityId ?? null],
    queryFn: () => agroApi.aiAssist(input),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
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