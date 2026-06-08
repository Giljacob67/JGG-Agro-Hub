import type { LucideIcon } from "lucide-react";
import { StrategicKpiCard } from "@/components/command-center/strategic-kpi-card";

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  href?: string;
  highlight?: boolean;
}

/** Wrapper legado — delega para StrategicKpiCard. */
export function KpiCard({
  label,
  value,
  sublabel,
  icon,
  href,
  highlight,
}: KpiCardProps) {
  return (
    <StrategicKpiCard
      label={label}
      value={value}
      context={sublabel ?? "Indicador operacional"}
      icon={icon}
      href={href}
      highlight={highlight}
      severity={highlight ? "attention" : "neutral"}
    />
  );
}