import { useCallback, useState } from "react";
import type { SortDir } from "@shared/agro/list-types";

interface SortState {
  sort?: string;
  dir?: SortDir;
}

/**
 * Estado de ordenação para tabelas. Clicar num header cicla:
 * asc → desc → limpa (volta à ordem default do backend).
 */
export function useTableSort() {
  const [state, setState] = useState<SortState>({});

  const onSort = useCallback((sortKey: string) => {
    setState((prev) => {
      if (prev.sort !== sortKey) return { sort: sortKey, dir: "asc" };
      if (prev.dir === "asc") return { sort: sortKey, dir: "desc" };
      return {}; // desc → limpa
    });
  }, []);

  return { sort: state.sort, dir: state.dir, onSort };
}
