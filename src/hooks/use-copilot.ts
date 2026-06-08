import { useMutation } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { CopilotQueryRequest } from "@shared/agro/types";

export function useCopilotQuery() {
  return useMutation({
    mutationFn: (input: CopilotQueryRequest) => agroApi.copilotQuery(input),
  });
}