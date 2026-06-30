import { useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * Aplica uma mutação a vários ids em sequência, com feedback agregado.
 * Reusa as mutations single-record existentes (sem endpoint bulk no backend).
 */
export function useBulkApply() {
  const [isPending, setIsPending] = useState(false);

  const apply = useCallback(
    async (
      ids: string[],
      fn: (id: string) => Promise<unknown>,
      onDone?: () => void,
    ) => {
      if (ids.length === 0 || isPending) return;
      setIsPending(true);
      let ok = 0;
      let fail = 0;
      for (const id of ids) {
        try {
          await fn(id);
          ok++;
        } catch {
          fail++;
        }
      }
      setIsPending(false);
      if (fail === 0) {
        toast.success(
          `${ok} ${ok > 1 ? "registros atualizados" : "registro atualizado"}`,
        );
      } else {
        toast.error(`${ok} atualizados, ${fail} com erro`);
      }
      onDone?.();
    },
    [isPending],
  );

  return { apply, isPending };
}
