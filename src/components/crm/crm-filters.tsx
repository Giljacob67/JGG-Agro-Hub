import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CrmFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function CrmFilters({
  search,
  onSearchChange,
  placeholder = "Buscar...",
  children,
}: CrmFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
      {children}
    </div>
  );
}