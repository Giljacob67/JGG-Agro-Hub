import { Link } from "wouter";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckSquare,
  DollarSign,
  Scale,
  Target,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/crm/dashboard-section";
import { KpiCard } from "@/components/crm/kpi-card";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { PracticeBreakdownTable } from "@/components/crm/practice-breakdown";
import { QuickActions } from "@/components/crm/quick-actions";
import { RegionPortfolioGrid } from "@/components/crm/region-portfolio";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmStats } from "@/hooks/use-crm-queries";
import { AGRO_PRACTICE_AREAS } from "@/lib/agro-practices";
import {
  formatBrl,
  formatDate,
  isOverdue,
  OPPORTUNITY_PRIORITY,
  RISK_LEVEL,
} from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";
import { JGG_AGRO_HUB_NAME, JGG_GROUP_NAME } from "@/lib/brand";

function contactHref(entityType: "lead" | "oportunidade", id: string) {
  return entityType === "lead"
    ? ROUTES.crm.leadDetail(id)
    : ROUTES.crm.opportunityDetail(id);
}

export default function CommandCenterPage() {
  usePageTitle("Dashboard Executivo");
  const { data: stats, isLoading } = useCrmStats();

  if (isLoading || !stats) {
    return (
      <AppShell>
        <CrmLoadingState label="Carregando dashboard executivo…" />
      </AppShell>
    );
  }

  const alertCount = stats.riskAlerts.length + stats.overdueTasks;
  const conversionPct =
    stats.activeLeads > 0
      ? Math.round((stats.qualifiedLeads / stats.activeLeads) * 100)
      : 0;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
              {JGG_GROUP_NAME}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
              Dashboard Executivo
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
              Gestão jurídica e comercial do {JGG_AGRO_HUB_NAME} — carteira,
              pipeline, demandas e prazos do agronegócio.
            </p>
          </div>
          <QuickActions />
        </header>

        {alertCount > 0 && (
          <div className="rounded-xl border border-accent/30 bg-accent/8 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold">
                  Alertas de prazo, risco e urgência ({alertCount})
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  {stats.riskAlerts.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={ROUTES.crm.matterDetail(m.id)}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {m.title}
                      </Link>{" "}
                      — prazo {formatDate(m.deadline)} · risco{" "}
                      {RISK_LEVEL[m.risk].toLowerCase()}
                    </li>
                  ))}
                  {stats.overdueTasksList.map((t) => (
                    <li key={t.id}>
                      Tarefa vencida:{" "}
                      <Link
                        href={ROUTES.crm.tasks}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {t.title}
                      </Link>{" "}
                      — {formatDate(t.dueDate)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <KpiCard
            label="Contas ativas"
            value={stats.activeAccounts}
            icon={Building2}
            href={ROUTES.crm.accounts}
          />
          <KpiCard
            label="Leads ativos"
            value={stats.activeLeads}
            sublabel={`${conversionPct}% qualificados`}
            icon={UserPlus}
            href={ROUTES.crm.leads}
          />
          <KpiCard
            label="Oportunidades"
            value={stats.openOpportunities}
            icon={Target}
            href={ROUTES.crm.opportunities}
          />
          <KpiCard
            label="Pipeline aberto"
            value={formatBrl(stats.pipelineValue)}
            icon={DollarSign}
            href={ROUTES.crm.opportunities}
            highlight
          />
          <KpiCard
            label="Fechado (contrato)"
            value={formatBrl(stats.closedValue)}
            icon={TrendingUp}
            href={ROUTES.crm.opportunities}
          />
          <KpiCard
            label="Demandas ativas"
            value={stats.activeMatters}
            icon={Scale}
            href={ROUTES.crm.matters}
          />
          <KpiCard
            label="Tarefas vencidas"
            value={stats.overdueTasks}
            icon={CheckSquare}
            href={ROUTES.crm.tasks}
            highlight={stats.overdueTasks > 0}
          />
          <KpiCard
            label="Tarefas — 7 dias"
            value={stats.upcomingTasks}
            icon={CalendarClock}
            href={ROUTES.crm.tasks}
          />
        </div>

        <DashboardSection
          title="Pipeline por fase"
          href={ROUTES.crm.opportunities}
          linkLabel="Ver pipeline"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.pipelineByStage.map((stage) => (
              <Card key={stage.id} className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {stage.label}
                </p>
                <p className="text-xl font-bold mt-1 tabular-nums">{stage.count}</p>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {formatBrl(stage.value)}
                </p>
              </Card>
            ))}
          </div>
        </DashboardSection>

        <div className="grid lg:grid-cols-2 gap-6">
          <DashboardSection
            title="Carteira por área de atuação"
            count={stats.practiceBreakdown.length}
            href={ROUTES.crm.matters}
          >
            <PracticeBreakdownTable items={stats.practiceBreakdown} />
          </DashboardSection>

          <DashboardSection
            title="Carteira por região"
            count={stats.portfolioByRegion.length}
            href={ROUTES.crm.accounts}
          >
            <RegionPortfolioGrid items={stats.portfolioByRegion} />
          </DashboardSection>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <DashboardSection
            title="Oportunidades prioritárias"
            count={stats.priorityOpportunities.length}
            href={ROUTES.crm.opportunities}
          >
            <div className="space-y-3">
              {stats.priorityOpportunities.map((o) => (
                <Card key={o.id} className="p-4 hover:border-primary/25 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={ROUTES.crm.opportunityDetail(o.id)}
                        className="text-sm font-semibold leading-snug hover:text-primary"
                      >
                        {o.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {o.accountName} · {o.practice}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary tabular-nums">
                        {formatBrl(o.valueBrl)}
                      </p>
                      {o.priority === "alta" && (
                        <Badge variant="warning" className="mt-1">
                          {OPPORTUNITY_PRIORITY.alta}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {o.nextContact && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Próximo contato: {formatDate(o.nextContact)}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection
            title="Próximos contatos"
            count={stats.upcomingContacts.length}
            href={ROUTES.crm.leads}
          >
            <div className="space-y-3">
              {stats.upcomingContacts.length === 0 ? (
                <Card className="p-4 border-dashed">
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhum contato agendado nos próximos 14 dias.
                  </p>
                </Card>
              ) : (
                stats.upcomingContacts.slice(0, 6).map((c) => (
                  <Card key={`${c.entityType}-${c.id}`} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={contactHref(c.entityType, c.id)}
                          className="text-sm font-semibold hover:text-primary"
                        >
                          {c.accountOrLead}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1">
                          {c.name} · {c.owner}
                        </p>
                      </div>
                      <Badge variant="outline">{formatDate(c.date)}</Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </DashboardSection>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <DashboardSection title="Demandas com prazo próximo" href={ROUTES.crm.matters}>
            <div className="space-y-3">
              {stats.upcomingMatters.slice(0, 5).map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={ROUTES.crm.matterDetail(m.id)}
                        className="text-sm font-semibold hover:text-primary"
                      >
                        {m.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.accountName} · {m.practice}
                      </p>
                    </div>
                    <Badge
                      variant={
                        m.risk === "critico"
                          ? "danger"
                          : m.risk === "alto"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {formatDate(m.deadline)}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection title="Tarefas críticas" href={ROUTES.crm.tasks}>
            <div className="space-y-3">
              {[...stats.overdueTasksList, ...stats.upcomingTasksList]
                .slice(0, 6)
                .map((t) => (
                  <Card key={t.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.owner} · {t.relatedTo}
                        </p>
                      </div>
                      <Badge
                        variant={
                          t.status === "atrasada" || isOverdue(t.dueDate)
                            ? "danger"
                            : "outline"
                        }
                      >
                        {formatDate(t.dueDate)}
                      </Badge>
                    </div>
                  </Card>
                ))}
            </div>
          </DashboardSection>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Áreas de atuação Agro
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {AGRO_PRACTICE_AREAS.map((area) => (
              <div
                key={area.id}
                className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
              >
                {area.label}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}