import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RegionPortfolio } from "@shared/agro/types";
import { formatBrl } from "@/lib/crm-labels";
import { categoricalColor } from "./chart-theme";

interface RegionDonutChartProps {
  items: RegionPortfolio[];
  limit?: number;
}

interface TooltipPayloadItem {
  payload: RegionPortfolio & { _total: number };
}

function RegionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pct = d._total > 0 ? Math.round((d.pipelineValue / d._total) * 100) : 0;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold">{d.region}</p>
      <p className="text-xs font-medium text-primary tabular-nums">
        {formatBrl(d.pipelineValue)} · {pct}%
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {d.accounts} {d.accounts === 1 ? "conta" : "contas"}
      </p>
    </div>
  );
}

/**
 * Distribuição do pipeline (R$) por região — donut. Legenda à direita com
 * valor por região; tooltip mostra participação percentual.
 */
export function RegionDonutChart({ items, limit = 8 }: RegionDonutChartProps) {
  const sorted = [...items].sort((a, b) => b.pipelineValue - a.pipelineValue);
  const top = sorted.slice(0, limit);
  const total = top.reduce((sum, r) => sum + r.pipelineValue, 0);
  const data = top.map((r) => ({ ...r, _total: total }));

  if (data.length === 0 || total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem pipeline distribuído por região.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-[200px] w-full max-w-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="pipelineValue"
              nameKey="region"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={categoricalColor(i)} />
              ))}
            </Pie>
            <Tooltip content={<RegionTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-1.5 self-stretch">
        {data.map((r, i) => {
          const pct = total > 0 ? Math.round((r.pipelineValue / total) * 100) : 0;
          return (
            <li key={r.region} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: categoricalColor(i) }}
              />
              <span className="flex-1 truncate text-muted-foreground">
                {r.region}
              </span>
              <span className="tabular-nums font-medium">{formatBrl(r.pipelineValue)}</span>
              <span className="w-9 text-right tabular-nums text-muted-foreground">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
