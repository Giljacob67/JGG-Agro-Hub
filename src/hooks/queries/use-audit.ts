import { useQuery } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import { auditKeys } from "./query-keys";

export function useAuditLogs(
  params: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => agroApi.audit(params),
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: auditKeys.stats,
    queryFn: agroApi.auditStats,
  });
}
