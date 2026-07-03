import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { TaskListParams } from "@shared/agro/list-types";
import type { TaskStatus } from "@shared/agro/types";
import { crmKeys } from "./query-keys";

export function useTasks(params: TaskListParams = { facets: true }) {
  return useQuery({
    queryKey: [...crmKeys.tasks, params],
    queryFn: () => agroApi.tasks(params),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agroApi.createTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.tasks });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useRelatedTasks(entityId: string) {
  return useQuery({
    queryKey: crmKeys.relatedTasks(entityId),
    queryFn: () => agroApi.tasksByRelated(entityId),
    enabled: !!entityId,
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      agroApi.updateTaskStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.tasks });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}
