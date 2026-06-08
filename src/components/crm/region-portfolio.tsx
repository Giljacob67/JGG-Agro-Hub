import type { RegionPortfolio } from "@shared/agro/types";
import { Card } from "@/components/ui/card";
import { formatBrl } from "@/lib/crm-labels";

interface RegionPortfolioProps {
  items: RegionPortfolio[];
  limit?: number;
}

export function RegionPortfolioGrid({ items, limit = 6 }: RegionPortfolioProps) {
  const rows = items.slice(0, limit);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {rows.map((row) => (
        <Card key={row.region} className="p-4 hover:border-primary/15 transition-colors">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
            {row.region}
          </p>
          <p className="text-lg font-bold mt-1 tabular-nums">
            {formatBrl(row.pipelineValue)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {row.accounts} {row.accounts === 1 ? "conta" : "contas"} na carteira
          </p>
        </Card>
      ))}
    </div>
  );
}