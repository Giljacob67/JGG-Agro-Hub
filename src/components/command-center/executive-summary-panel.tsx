import type { ComponentType, ReactNode } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  CalendarClock,
  DollarSign,
  Scale,
  Target,
} from "lucide-react";
import type { CrmStats } from "@shared/agro/types";
import { Badge } from "@/components/ui/badge";
import {
  formatBrl,
  formatDate,
  RISK_LEVEL,
  riskBadgeVariant,
} from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";

interface ExecutiveSummaryPanelProps {
  stats: CrmStats;
}

function SummaryColumn({
  title,
  count,
  href,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  href: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xs font-semibold text-foreground truncate">{title}</p>
        </div>
        <Badge variant="muted" className="tabular-nums shrink-0">
          {count}
        </Badge>
      </div>
      <ul className="space-y-2 flex-1">{children}</ul>
      <Link
        href={href}
        className="text-[11px] font-medium text-primary hover:underline mt-3 inline-block"
      >
        Ver detalhes
      </Link>
    </div>
  );
}

function SummaryItem({
  title,
  meta,
  href,
  badge,
}: {
  title: string;
  meta: string;
  href?: string;
  badge?: ReactNode;
}) {
  const label = href ? (
    <Link href={href} className="font-medium text-foreground hover:text-primary line-clamp-2">
      {title}
    </Link>
  ) : (
    <span className="font-medium text-foreground line-clamp-2">{title}</span>
  );

  return (
    <li className="surface-inset px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">{label}</div>
        {badge}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 truncate">{meta}</p>
    </li>
  );
}

export function ExecutiveSummaryPanel({ stats }: ExecutiveSummaryPanelProps) {
  const criticalMatters = [
    ...stats.riskAlerts,
    ...stats.upcomingMatters.filter((m) => m.risk === "alto" || m.risk === "critico"),
  ].slice(0, 3);

  return (
    <section className="executive-panel p-6 md:p-7">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <p className="text-label-caps text-primary/80">Painel executivo</p>
          <h2 className="text-lg font-semibold tracking-tight mt-1">
            Resumo operacional prioritário
          </h2>
        </div>
        <p className="text-xs text-muted-foreground max-w-md">
          Visão consolidada de prazos, pipeline, oportunidades estratégicas e riscos
          jurídicos da carteira Agro.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-5 xl:gap-4">
        <SummaryColumn
          title="Prazos críticos"
          count={stats.riskAlerts.length + stats.overdueTasks}
          href={ROUTES.crm.tasks}
          icon={AlertTriangle}
        >
          {criticalMatters.length === 0 && stats.overdueTasksList.length === 0 ? (
            <li className="text-xs text-muted-foreground py-2">Nenhum prazo crítico imediato.</li>
          ) : (
            <>
              {criticalMatters.map((m) => (
                <SummaryItem
                  key={m.id}
                  title={m.title}
                  meta={`${m.accountName} · ${formatDate(m.deadline)}`}
                  href={ROUTES.crm.matterDetail(m.id)}
                  badge={
                    <Badge variant={riskBadgeVariant(m.risk)} className="shrink-0">
                      {RISK_LEVEL[m.risk]}
                    </Badge>
                  }
                />
              ))}
              {stats.overdueTasksList.slice(0, 2).map((t) => (
                <SummaryItem
                  key={t.id}
                  title={t.title}
                  meta={`${t.owner} · vencida ${formatDate(t.dueDate)}`}
                  href={ROUTES.crm.tasks}
                  badge={<Badge variant="danger">Vencida</Badge>}
                />
              ))}
            </>
          )}
        </SummaryColumn>

        <SummaryColumn
          title="Pipeline aberto"
          count={stats.openOpportunities}
          href={ROUTES.crm.opportunities}
          icon={DollarSign}
        >
          {stats.pipelineByStage
            .filter((s) => s.count > 0)
            .slice(0, 3)
            .map((stage) => (
              <SummaryItem
                key={stage.id}
                title={stage.label}
                meta={`${stage.count} oportunidade${stage.count !== 1 ? "s" : ""} · ${formatBrl(stage.value)}`}
              />
            ))}
        </SummaryColumn>

        <SummaryColumn
          title="Oportunidades prioritárias"
          count={stats.priorityOpportunities.length}
          href={ROUTES.crm.opportunities}
          icon={Target}
        >
          {stats.priorityOpportunities.slice(0, 3).map((o) => (
            <SummaryItem
              key={o.id}
              title={o.title}
              meta={`${o.accountName} · ${formatBrl(o.valueBrl)}`}
              href={ROUTES.crm.opportunityDetail(o.id)}
            />
          ))}
        </SummaryColumn>

        <SummaryColumn
          title="Demandas de alto risco"
          count={stats.riskAlerts.length}
          href={ROUTES.crm.matters}
          icon={Scale}
        >
          {stats.riskAlerts.length === 0 ? (
            <li className="text-xs text-muted-foreground py-2">Carteira sem alertas de risco.</li>
          ) : (
            stats.riskAlerts.slice(0, 3).map((m) => (
              <SummaryItem
                key={m.id}
                title={m.title}
                meta={`${m.practice} · ${formatDate(m.deadline)}`}
                href={ROUTES.crm.matterDetail(m.id)}
                badge={
                  <Badge variant={riskBadgeVariant(m.risk)} className="shrink-0">
                    {RISK_LEVEL[m.risk]}
                  </Badge>
                }
              />
            ))
          )}
        </SummaryColumn>

        <SummaryColumn
          title="Próximos contatos"
          count={stats.upcomingContacts.length}
          href={ROUTES.crm.leads}
          icon={CalendarClock}
        >
          {stats.upcomingContacts.length === 0 ? (
            <li className="text-xs text-muted-foreground py-2">Nenhum contato na quinzena.</li>
          ) : (
            stats.upcomingContacts.slice(0, 3).map((c) => (
              <SummaryItem
                key={`${c.entityType}-${c.id}`}
                title={c.accountOrLead}
                meta={`${c.name} · ${formatDate(c.date)}`}
                href={
                  c.entityType === "lead"
                    ? ROUTES.crm.leadDetail(c.id)
                    : ROUTES.crm.opportunityDetail(c.id)
                }
                badge={<Badge variant="outline">{c.channel}</Badge>}
              />
            ))
          )}
        </SummaryColumn>
      </div>
    </section>
  );
}