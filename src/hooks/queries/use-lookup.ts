import { useQuery } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";

export function useLookupCnpj(cnpj: string, enabled = false) {
  return useQuery({
    queryKey: ["lookup", "cnpj", cnpj],
    queryFn: () => agroApi.lookupCnpj(cnpj),
    enabled,
  });
}

export function useLookupCpf(cpf: string, enabled = false) {
  return useQuery({
    queryKey: ["lookup", "cpf", cpf],
    queryFn: () => agroApi.lookupCpf(cpf),
    enabled,
  });
}
