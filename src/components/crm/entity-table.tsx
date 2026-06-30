import { cn } from "@/lib/utils";
import { Search, Plus, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import type { SortDir } from "@shared/agro/list-types";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Quando definido, a coluna fica clicável e ordena por esta chave no backend. */
  sortKey?: string;
}

interface EntityTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  filteredEmptyMessage?: string;
  isFiltered?: boolean;
  getRowClassName?: (row: T) => string | undefined;
  /** Estado de ordenação atual (sortKey ativo). */
  sort?: string;
  dir?: SortDir;
  /** Dispara ao clicar num header ordenável. Alterna asc→desc→limpa. */
  onSort?: (sortKey: string) => void;
  /** Ativa coluna de checkboxes para seleção em massa. */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  allSelected?: boolean;
  someSelected?: boolean;
}

export function EntityTable<T extends { id: string }>({
  columns,
  data,
  emptyMessage = "Nenhum registro encontrado.",
  filteredEmptyMessage = "Nenhum resultado com os filtros atuais.",
  isFiltered = false,
  getRowClassName,
  sort,
  dir,
  onSort,
  selectable = false,
  selectedIds,
  onToggleRow,
  onToggleAll,
  allSelected = false,
  someSelected = false,
}: EntityTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/80 rounded-xl bg-muted/15">
        <div className="rounded-full bg-muted/50 p-3 mb-3">
          {isFiltered ? (
            <Search className="w-6 h-6 text-muted-foreground" />
          ) : (
            <Plus className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {isFiltered ? filteredEmptyMessage : emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-card-border rounded-xl overflow-hidden bg-card shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/80 bg-muted/30">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <SelectionCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={() => onToggleAll?.()}
                    aria-label="Selecionar todos"
                  />
                </th>
              )}
              {columns.map((col) => {
                const sortable = Boolean(col.sortKey && onSort);
                const active = sortable && sort === col.sortKey;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] whitespace-nowrap",
                      col.className,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort!(col.sortKey!)}
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-[0.12em]",
                          active && "text-foreground",
                        )}
                        aria-label={`Ordenar por ${col.header}`}
                      >
                        {col.header}
                        {active ? (
                          dir === "desc" ? (
                            <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUp className="w-3 h-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isSelected = selectedIds?.has(row.id) ?? false;
              return (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border/50 last:border-0 hover:bg-muted/25 transition-colors",
                  isSelected && "bg-primary/5",
                  getRowClassName?.(row),
                )}
              >
                {selectable && (
                  <td className="w-10 px-4 py-3">
                    <SelectionCheckbox
                      checked={isSelected}
                      onChange={() => onToggleRow?.(row.id)}
                      aria-label={`Selecionar linha ${row.id}`}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SelectionCheckbox({
  checked,
  indeterminate,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  "aria-label": string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = Boolean(indeterminate) && !checked;
      }}
      onChange={onChange}
      aria-label={ariaLabel}
      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
    />
  );
}