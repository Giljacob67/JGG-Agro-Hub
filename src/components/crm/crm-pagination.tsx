import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PAGE_SIZE } from "@shared/agro/list-types";

interface CrmPaginationProps {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Quando definido, mostra o seletor de itens por página. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function CrmPagination({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: CrmPaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-border">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">
          Mostrando {start}–{end} de {total}
          {totalPages > 1 && (
            <span className="ml-2">
              · Página {page} de {totalPages}
            </span>
          )}
        </p>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Por página</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              aria-label="Itens por página"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          {totalPages > 2 && (
            <PageJump page={page} totalPages={totalPages} onJump={onPageChange} />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Próxima página"
          >
            Próxima
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PageJump({
  page,
  totalPages,
  onJump,
}: {
  page: number;
  totalPages: number;
  onJump: (page: number) => void;
}) {
  const [value, setValue] = useState("");

  const commit = () => {
    const target = Number(value);
    if (!Number.isNaN(target) && target >= 1 && target <= totalPages) {
      onJump(target);
    }
    setValue("");
  };

  return (
    <input
      type="number"
      min={1}
      max={totalPages}
      value={value}
      placeholder={String(page)}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      onBlur={commit}
      aria-label="Ir para página"
      className="h-8 w-14 rounded-md border border-border bg-background px-2 text-center text-xs tabular-nums"
    />
  );
}
