import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { AgroRole } from "@shared/agro/types";
import { crmKeys } from "./query-keys";

export function useUsers() {
  return useQuery({
    queryKey: crmKeys.users,
    queryFn: () => agroApi.users(),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      email: string;
      name: string;
      role: AgroRole;
      active?: boolean;
      password?: string;
    }) => agroApi.createUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.users }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { name?: string; role?: AgroRole; active?: boolean };
    }) => agroApi.updateUser(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.users }),
  });
}

export function useSetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      agroApi.setUserPassword(id, password),
  });
}
