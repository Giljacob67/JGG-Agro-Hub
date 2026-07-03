import { useQuery } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import { crmKeys } from "./query-keys";

export function useCrmStats() {
  return useQuery({ queryKey: crmKeys.stats, queryFn: agroApi.stats });
}

export function useCrmTimeseries() {
  return useQuery({
    queryKey: crmKeys.timeseries,
    queryFn: agroApi.timeseries,
  });
}
