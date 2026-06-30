import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BulkAction {
  id: string;
  /** Texto do placeholder do select (ex: "Alterar status"). */
  label: string;
  options: Array<{ value: string; label: string }>;
  onApply: (value: string) => void;
}

interface BulkActionsBarProps {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
  isPending?: boolean;
}

/** Barra de ações em massa — visível só quando há linhas selecionadas. */
export function BulkActionsBar({
  count,
  actions,
  onClear,
  isPending,
}: BulkActionsBarProps) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 mb-3">
      <span className="text-sm font-medium">
        {count} {count > 1 ? "selecionados" : "selecionado"}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <select
            key={action.id}
            value=""
            disabled={isPending}
            onChange={(e) => {
              if (e.target.value) action.onApply(e.target.value);
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-50"
            aria-label={action.label}
          >
            <option value="" disabled>
              {action.label}
            </option>
            {action.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={isPending}
        className="ml-auto"
      >
        <X className="w-3.5 h-3.5" /> Limpar seleção
      </Button>
    </div>
  );
}
