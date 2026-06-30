import { useCallback, useMemo, useState } from "react";

/**
 * Seleção de linhas por id para ações em massa.
 * `visibleIds` são os ids atualmente renderizados (página atual) —
 * usados para o "selecionar todos" do header.
 */
export function useRowSelection(visibleIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const everyVisible =
        visibleIds.length > 0 && visibleIds.every((id) => next.has(id));
      if (everyVisible) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }, [visibleIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = !allSelected && visibleIds.some((id) => selected.has(id));

  return {
    selected,
    selectedIds,
    count: selected.size,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}
