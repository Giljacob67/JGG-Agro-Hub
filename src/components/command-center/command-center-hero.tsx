import { Link } from "wouter";
import { ArrowRight, ChevronDown, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  JGG_AGRO_COMMAND_CENTER,
  JGG_AGRO_COMMAND_SUBTITLE,
  JGG_GROUP_NAME,
} from "@/lib/brand";
import type { ExecutiveInsight, OperationalStatus } from "@/lib/command-intelligence";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

interface CommandCenterHeroProps {
  status: OperationalStatus;
  updatedAt: string;
  weekSummary: string;
  insights: ExecutiveInsight[];
  criticalCount: number;
}

const statusConfig: Record<
  OperationalStatus,
  { label: string; variant: "success" | "warning" | "executive" }
> = {
  estavel: { label: "Operação estável", variant: "success" },
  atencao: { label: "Atenção operacional", variant: "warning" },
  critico: { label: "Operação crítica", variant: "executive" },
};

const insightBorder: Record<ExecutiveInsight["severity"], string> = {
  neutral: "border-border/80",
  attention: "border-accent/30 dark:border-accent/35",
  critical: "border-red-200/70 dark:border-red-900/50",
};

export function CommandCenterHero({
  status,
  updatedAt,
  weekSummary,
  insights,
  criticalCount,
}: CommandCenterHeroProps) {
  const statusMeta = statusConfig[status];
  const ctaHref = criticalCount > 0 ? ROUTES.crm.matters : ROUTES.crm.opportunities;
  const ctaLabel =
    criticalCount > 0
      ? "Revisar demandas críticas"
      : "Abrir pipeline comercial";

  return (
    <section className="command-hero p-6 md:p-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-label-caps text-primary/80">{JGG_GROUP_NAME}</p>
            <Badge variant={statusMeta.variant} className="gap-1.5">
              <Radio className="w-3 h-3" />
              {statusMeta.label}
            </Badge>
          </div>
          <div>
            <h1 className="text-2xl md:text-[1.75rem] font-semibold tracking-tight text-foreground">
              {JGG_AGRO_COMMAND_CENTER}
            </h1>
            <p className="text-sm md:text-[0.9375rem] text-muted-foreground mt-3 leading-relaxed max-w-2xl">
              {JGG_AGRO_COMMAND_SUBTITLE}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Atualizado em {updatedAt}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <Button asChild className="shadow-none">
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="shadow-none">
            <Link href={ROUTES.crm.root}>CRM Agro</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border/70 space-y-4">
        <div>
          <p className="text-label-caps mb-2">Resumo da semana</p>
          <p className="text-sm text-foreground/85 leading-relaxed">{weekSummary}</p>
        </div>

        {insights.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "surface-inset px-4 py-3",
                  insightBorder[insight.severity],
                )}
              >
                <p className="text-xs font-semibold text-foreground">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                  {insight.detail}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <a
            href="#cc-kpis"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Explorar indicadores
            <ChevronDown className="w-3.5 h-3.5 opacity-70" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}