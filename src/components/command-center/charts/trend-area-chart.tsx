import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeseriesPoint } from "@shared/agro/stats";
import { BORDER, MUTED, PRIMARY } from "./chart-theme";

interface TrendAreaChartProps {
  data: TimeseriesPoint[];
  /** Formata o valor no eixo Y e no tooltip. */
  valueFormatter?: (value: number) => string;
  /** Cor da área/linha (default: primária do tema). */
  color?: string;
  /** Altura do gráfico em px. */
  height?: number;
}

interface TooltipPayloadItem {
  payload: TimeseriesPoint;
}

function makeTrendTooltip(format: (v: number) => string) {
  return function TrendTooltip({
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
        <p className="text-xs font-semibold capitalize">{d.label}</p>
        <p className="text-xs font-medium text-primary tabular-nums">
          {format(d.value)}
        </p>
      </div>
    );
  };
}

/**
 * Série temporal mensal — área suave. Usada para tendências de aquisição de
 * leads e projeção de pipeline no Command Center.
 */
export function TrendAreaChart({
  data,
  valueFormatter = (v) => String(v),
  color = PRIMARY,
  height = 200,
}: TrendAreaChartProps) {
  const hasData = data.some((p) => p.value > 0);
  if (!hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem dados suficientes para exibir a tendência.
      </p>
    );
  }

  const gradientId = `trend-${color.replace(/[^a-z0-9]/gi, "")}`;
  const Tip = makeTrendTooltip(valueFormatter);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: MUTED }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => valueFormatter(Number(v))}
          tick={{ fontSize: 10, fill: MUTED }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          content={<Tip />}
          cursor={{ stroke: color, strokeOpacity: 0.3 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={{ r: 2, fill: color }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
