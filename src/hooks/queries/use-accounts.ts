import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { AccountListParams } from "@shared/agro/list-types";
import { crmKeys } from "./query-keys";

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agroApi.createAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.accounts });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

export function useAccounts(params: AccountListParams = { facets: true }) {
  return useQuery({
    queryKey: [...crmKeys.accounts, params],
    queryFn: () => agroApi.accounts(params),
  });
}

export function useAccountTimeline(id: string) {
  return useQuery({
    queryKey: [...crmKeys.account(id), "timeline"],
    queryFn: () => agroApi.accountTimeline(id),
    enabled: !!id,
  });
}

export function useAllAccounts() {
  return useQuery({
    queryKey: crmKeys.accounts,
    queryFn: () => agroApi.accounts({}),
  });
}
