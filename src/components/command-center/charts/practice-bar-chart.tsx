import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PracticeBreakdown } from "@shared/agro/types";
import { formatBrl } from "@/lib/crm-labels";
import { categoricalColor, MUTED } from "./chart-theme";

interface PracticeBarChartProps {
  items: PracticeBreakdown[];
  limit?: number;
}

interface TooltipPayloadItem {
  payload: PracticeBreakdown;
}

function PracticeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold">{d.practice}</p>
      <p className="text-xs font-medium text-primary tabular-nums">
        {formatBrl(d.pipelineValue)}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {d.matters} demandas · {d.opportunities} oportunidades
      </p>
    </div>
  );
}

/**
 * Pipeline (R$) por área de atuação — barras horizontais, top N por valor.
 */
export function PracticeBarChart({ items, limit = 8 }: PracticeBarChartProps) {
  const data = [...items]
    .sort((a, b) => b.pipelineValue - a.pipelineValue)
    .slice(0, limit);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma demanda ou oportunidade registrada.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 40, 180)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        barCategoryGap={6}
      >
        <XAxis
          type="number"
          tickFormatter={(v) => formatBrl(Number(v))}
          tick={{ fontSize: 10, fill: MUTED }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="practice"
          width={140}
          tick={{ fontSize: 11, fill: MUTED }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<PracticeTooltip />}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
        />
        <Bar dataKey="pipelineValue" radius={[0, 4, 4, 0]} minPointSize={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={categoricalColor(i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
