import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { KnowledgeDocumentInput } from "@shared/agro/types";

export function useKnowledge(categoryId?: string) {
  return useQuery({
    queryKey: ["knowledge", categoryId ?? "all"],
    queryFn: () => agroApi.knowledge(categoryId),
    staleTime: 60_000,
  });
}

function useInvalidateKnowledge() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["knowledge"] });
}

export function useCreateKnowledgeDocument() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (input: KnowledgeDocumentInput) =>
      agroApi.createKnowledgeDocument(input),
    onSuccess: invalidate,
  });
}

export function useUpdateKnowledgeDocument() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<KnowledgeDocumentInput>;
    }) => agroApi.updateKnowledgeDocument(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteKnowledgeDocument() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (id: string) => agroApi.deleteKnowledgeDocument(id),
    onSuccess: invalidate,
  });
}