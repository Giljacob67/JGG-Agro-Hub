import { cn } from "@/lib/utils";

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
      <p className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border rounded-xl">
        {isFiltered ? filteredEmptyMessage : emptyMessage}
      </p>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap",
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
                  "border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors",
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