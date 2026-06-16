import { cn } from "@/lib/utils";
import { Search, Plus } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface EntityTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  filteredEmptyMessage?: string;
  isFiltered?: boolean;
  getRowClassName?: (row: T) => string | undefined;
}

export function EntityTable<T extends { id: string }>({
  columns,
  data,
  emptyMessage = "Nenhum registro encontrado.",
  filteredEmptyMessage = "Nenhum resultado com os filtros atuais.",
  isFiltered = false,
  getRowClassName,
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
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] whitespace-nowrap",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border/50 last:border-0 hover:bg-muted/25 transition-colors",
                  getRowClassName?.(row),
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}