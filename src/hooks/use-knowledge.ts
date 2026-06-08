import { useQuery } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";

export function useKnowledge(categoryId?: string) {
  return useQuery({
    queryKey: ["knowledge", categoryId ?? "all"],
    queryFn: () => agroApi.knowledge(categoryId),
    staleTime: 60_000,
  });
}