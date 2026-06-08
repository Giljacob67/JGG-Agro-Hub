import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { InsightSeverity } from "@/lib/command-intelligence";

interface StrategicKpiCardProps {
  label: string;
  value: string | number;
  context: string;
  observation?: string;
  icon: LucideIcon;
  href?: string;
  highlight?: boolean;
  severity?: InsightSeverity;
}

const severityStyles: Record<InsightSeverity, string> = {
  neutral: "border-card-border",
  attention: "border-accent/35 bg-accent/[0.04]",
  critical: "border-red-200/80 bg-red-50/40 dark:bg-red-950/10",
};

const severityDot: Record<InsightSeverity, string> = {
  neutral: "bg-primary/60",
  attention: "bg-accent",
  critical: "bg-red-500",
};

export function StrategicKpiCard({
  label,
  value,
  context,
  observation,
  icon: Icon,
  href,
  highlight,
  severity = "neutral",
}: StrategicKpiCardProps) {
  const content = (
    <div
      className={cn(
        "surface-panel h-full p-5 transition-colors",
        href && "hover:border-primary/25 cursor-pointer",
        highlight && severityStyles[severity],
        !highlight && severityStyles.neutral,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label-caps">{label}</p>
          <p className="text-2xl md:text-[1.65rem] font-semibold tracking-tight tabular-nums mt-2 text-foreground">
            {value}
          </p>
          <p className="text-sm text-foreground/80 mt-2 leading-snug">{context}</p>
          {observation && (
            <div className="flex items-center gap-2 mt-3">
              <span
                className={cn("w-1.5 h-1.5 rounded-full shrink-0", severityDot[severity])}
                aria-hidden
              />
              <p className="text-xs text-muted-foreground">{observation}</p>
            </div>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg border border-border/80 bg-muted/40 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}