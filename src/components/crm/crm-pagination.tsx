import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PAGE_SIZE } from "@shared/agro/list-types";

interface CrmPaginationProps {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function CrmPagination({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  total,
  onPageChange,
}: CrmPaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-border">
      <p className="text-xs text-muted-foreground tabular-nums">
        Mostrando {start}–{end} de {total}
        {totalPages > 1 && (
          <span className="ml-2">
            · Página {page} de {totalPages}
          </span>
        )}
      </p>
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