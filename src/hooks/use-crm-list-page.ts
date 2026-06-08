import { useCallback, useState } from "react";

/** Mantém página por combinação de filtros e reseta para 1 quando filtros mudam. */
export function useCrmListPage(...resetDeps: unknown[]) {
  const filterKey = JSON.stringify(resetDeps);
  const [pageByFilter, setPageByFilter] = useState<Record<string, number>>({});

  const page = pageByFilter[filterKey] ?? 1;
  const setPage = useCallback(
    (next: number) => {
      setPageByFilter((prev) => ({ ...prev, [filterKey]: next }));
    },
    [filterKey],
  );

  return { page, setPage };
}