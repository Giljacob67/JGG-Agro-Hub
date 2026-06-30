import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CrmStats } from "@shared/agro/types";
import { formatBrl } from "@/lib/crm-labels";
import { categoricalColor, MUTED } from "./chart-theme";

interface PipelineFunnelChartProps {
  stages: CrmStats["pipelineByStage"];
}

interface TooltipPayloadItem {
  payload: { label: string; count: number; value: number };
}

function FunnelTooltip({
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
      <p className="text-xs font-semibold">{d.label}</p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {d.count} {d.count === 1 ? "oportunidade" : "oportunidades"}
      </p>
      <p className="text-xs font-medium text-primary tabular-nums">
        {formatBrl(d.value)}
      </p>
    </div>
  );
}

/**
 * Funil do pipeline: barras horizontais por fase comercial, ordenadas como
 * o estágio aparece no fluxo. Largura ∝ nº de oportunidades; valor R$ no
 * tooltip. Substitui as barras CSS do PipelineHealthBoard por leitura real.
 */
export function PipelineFunnelChart({ stages }: PipelineFunnelChartProps) {
  const data = stages.map((s) => ({
    label: s.label,
    count: s.count,
    value: s.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 44, 200)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        barCategoryGap={6}
      >
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: MUTED }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tick={{ fontSize: 11, fill: MUTED }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<FunnelTooltip />}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} minPointSize={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={categoricalColor(i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
