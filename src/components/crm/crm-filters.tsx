import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CrmFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
  filteredCount?: number;
  totalCount?: number;
}

export function CrmFilters({
  search,
  onSearchChange,
  placeholder = "Buscar...",
  children,
  filteredCount,
  totalCount,
}: CrmFiltersProps) {
  const showCount =
    filteredCount !== undefined && totalCount !== undefined;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="pl-9"
            aria-label="Buscar"
          />
        </div>
        {children && (
          <div className="flex flex-wrap gap-2 sm:gap-3">{children}</div>
        )}
      </div>
      {showCount && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {filteredCount} de {totalCount} resultados
        </p>
      )}
    </div>
  );
}