import type { PracticeBreakdown } from "@shared/agro/types";
import { Card } from "@/components/ui/card";
import { formatBrl } from "@/lib/crm-labels";

interface PracticeBreakdownProps {
  items: PracticeBreakdown[];
  limit?: number;
}

export function PracticeBreakdownTable({ items, limit = 8 }: PracticeBreakdownProps) {
  const rows = items.slice(0, limit);

  if (rows.length === 0) {
    return (
      <Card className="p-4 border-dashed">
        <p className="text-sm text-muted-foreground text-center">
          Nenhuma demanda ou oportunidade registrada.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Área de atuação
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Demandas
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Oportunidades
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Pipeline
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.practice} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 font-medium">{row.practice}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {row.matters}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {row.opportunities}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                  {formatBrl(row.pipelineValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}