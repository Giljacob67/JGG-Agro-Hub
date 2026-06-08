import { useEffect, useState } from "react";

/** Mantém página atual e reseta para 1 quando filtros/busca mudam. */
export function useCrmListPage(...resetDeps: unknown[]) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, resetDeps);

  return { page, setPage };
}