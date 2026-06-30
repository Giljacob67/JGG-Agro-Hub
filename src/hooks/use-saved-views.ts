import { useCallback, useEffect, useState } from "react";

export interface SavedView<TState> {
  id: string;
  name: string;
  state: TState;
}

const PREFIX = "agro:saved-views:";

function read<TState>(key: string): SavedView<TState>[] {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as SavedView<TState>[]) : [];
  } catch {
    return [];
  }
}

/**
 * Visões salvas (presets de filtro) por recurso, persistidas em localStorage.
 * `key` identifica a tabela (ex: "leads").
 */
export function useSavedViews<TState>(key: string) {
  const [views, setViews] = useState<SavedView<TState>[]>(() =>
    read<TState>(key),
  );

  useEffect(() => {
    setViews(read<TState>(key));
  }, [key]);

  const persist = useCallback(
    (next: SavedView<TState>[]) => {
      setViews(next);
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(next));
      } catch {
        // ignora erros de quota
      }
    },
    [key],
  );

  const save = useCallback(
    (name: string, state: TState) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      // substitui visão de mesmo nome
      const existing = read<TState>(key).filter((v) => v.name !== trimmed);
      persist([...existing, { id, name: trimmed, state }]);
    },
    [key, persist],
  );

  const remove = useCallback(
    (id: string) => persist(read<TState>(key).filter((v) => v.id !== id)),
    [key, persist],
  );

  return { views, save, remove };
}
