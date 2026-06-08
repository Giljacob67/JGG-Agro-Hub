import { Link } from "wouter";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  DollarSign,
  Scale,
  Target,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AgroIntelligenceCard } from "@/components/command-center/agro-intelligence-card";
import { CommandCenterHero } from "@/components/command-center/command-center-hero";
import { CommandCenterSubNav } from "@/components/command-center/command-center-subnav";
import { ExecutiveSummaryPanel } from "@/components/command-center/executive-summary-panel";
import { PipelineHealthBoard } from "@/components/command-center/pipeline-health-board";
import { RiskCommandPanel } from "@/components/command-center/risk-command-panel";
import { StrategicKpiCard } from "@/components/command-center/strategic-kpi-card";
import { DashboardSection } from "@/components/crm/dashboard-section";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { PracticeBreakdownTable } from "@/components/crm/practice-breakdown";
import { RegionPortfolioGrid } from "@/components/crm/region-portfolio";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmStats } from "@/hooks/use-crm-queries";
import { AGRO_PRACTICE_AREAS } from "@/lib/agro-practices";
import {
  buildExecutiveInsights,
  buildIntelligenceCards,
  buildStrategicKpis,
  buildWeekSummary,
  getCriticalOperationCount,
  getOperationalStatus,
} from "@/lib/command-intelligence";
import {
  formatBrl,
  formatDate,
  isOverdue,
  OPPORTUNITY_PRIORITY,
} from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";

function contactHref(entityType: "lead" | "oportunidade", id: string) {
  return entityType === "lead"
    ? ROUTES.crm.leadDetail(id)
    : ROUTES.crm.opportunityDetail(id);
}

export default function CommandCenterPage() {
  usePageTitle("JGG Agro Command Center");
  const { data: stats, isLoading, dataUpdatedAt } = useCrmStats();

  if (isLoading || !stats) {
    return (
      <AppShell>
        <CrmLoadingState label="Carregando Command Center…" />
      </AppShell>
    );
  }

  const status = getOperationalStatus(stats);
  const insights = buildExecutiveInsights(stats);
  const strategicKpis = buildStrategicKpis(stats);
  const intelligenceCards = buildIntelligenceCards(stats);
  const criticalCount = getCriticalOperationCount(stats);
  const updatedAt = new Date(dataUpdatedAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const kpiIcons = {
    pipeline: DollarSign,
    deadlines: AlertTriangle,
    "priority-opps": Target,
    matters: Scale,
  } as const;

  const kpiHrefs = {
    pipeline: ROUTES.crm.opportunities,
    deadlines: ROUTES.crm.tasks,
    "priority-opps": ROUTES.crm.opportunities,
    matters: ROUTES.crm.matters,
  } as const;

  return (
    <AppShell>
      <div className="max-w-[88rem] mx-auto space-y-8">
        <CommandCenterHero
          status={status}
          updatedAt={updatedAt}
          weekSummary={buildWeekSummary(stats)}
          insights={insights}
          criticalCount={criticalCount}
        />

        <ExecutiveSummaryPanel stats={stats} />

        <CommandCenterSubNav />

        <section id="cc-kpis">
          <div className="mb-4">
            <p className="text-label-caps">Indicadores estratégicos</p>
            <h2 className="text-lg font-semibold tracking-tight mt-1">
              KPIs da operação Agro
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {strategicKpis.map((kpi) => (
              <StrategicKpiCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                context={kpi.context}
                observation={kpi.observation}
                icon={kpiIcons[kpi.id as keyof typeof kpiIcons]}
                href={kpiHrefs[kpi.id as keyof typeof kpiHrefs]}
                highlight={kpi.highlight}
                severity={kpi.severity}
              />
            ))}
          </div>
        </section>

        <section id="cc-intelligence">
          <div className="mb-4">
            <p className="text-label-caps">Camada analítica</p>
            <h2 className="text-lg font-semibold tracking-tight mt-1">
              Inteligência da operação
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Leituras derivadas da carteira — gargalos, riscos, relacionamento e
              impacto comercial.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {intelligenceCards.map((card) => (
              <AgroIntelligenceCard key={card.id} data={card} />
            ))}
          </div>
        </section>

        <div id="cc-pipeline">
          <PipelineHealthBoard stages={stats.pipelineByStage} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StrategicKpiCard
            label="Contas ativas"
            value={stats.activeAccounts}
            context="Carteira de relacionamento"
            observation={`${stats.portfolioByRegion.length} regiões ativas`}
            icon={Building2}
            href={ROUTES.crm.accounts}
          />
          <StrategicKpiCard
            label="Leads ativos"
            value={stats.activeLeads}
            context={`${stats.qualifiedLeads} qualificados`}
            observation="Base comercial em prospecção"
            icon={UserPlus}
            href={ROUTES.crm.leads}
          />
          <StrategicKpiCard
            label="Fechado (contrato)"
            value={formatBrl(stats.closedValue)}
            context="Receita contratada no período"
            icon={TrendingUp}
            href={ROUTES.crm.opportunities}
          />
          <StrategicKpiCard
            label="Tarefas — 7 dias"
            value={stats.upcomingTasks}
            context="Ações previstas na semana"
            observation={`${stats.overdueTasks} vencida${stats.overdueTasks !== 1 ? "s" : ""}`}
            icon={CalendarClock}
            href={ROUTES.crm.tasks}
            severity={stats.overdueTasks > 0 ? "attention" : "neutral"}
          />
        </div>

        <div id="cc-portfolio" className="grid lg:grid-cols-2 gap-6">
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
                <Card
                  key={o.id}
                  className="p-4 hover:border-primary/20 transition-colors shadow-none"
                >
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
                <Card className="p-4 border-dashed shadow-none">
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhum contato agendado nos próximos 14 dias.
                  </p>
                </Card>
              ) : (
                stats.upcomingContacts.slice(0, 6).map((c) => (
                  <Card key={`${c.entityType}-${c.id}`} className="p-4 shadow-none">
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

        <div id="cc-risks" className="grid lg:grid-cols-2 gap-6">
          <DashboardSection title="Demandas com prazo próximo" href={ROUTES.crm.matters}>
            <div className="space-y-3">
              {stats.upcomingMatters.slice(0, 5).map((m) => (
                <Card key={m.id} className="p-4 shadow-none">
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

          <RiskCommandPanel stats={stats} />
        </div>

        <section>
          <h2 className="text-label-caps mb-3">Áreas de atuação Agro</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {AGRO_PRACTICE_AREAS.map((area) => (
              <div
                key={area.id}
                className="surface-inset px-3 py-2.5 text-xs text-muted-foreground"
              >
                {area.label}
              </div>
            ))}
          </div>
        </section>

        <DashboardSection title="Tarefas críticas" href={ROUTES.crm.tasks}>
          <div className="grid sm:grid-cols-2 gap-3">
            {[...stats.overdueTasksList, ...stats.upcomingTasksList]
              .slice(0, 6)
              .map((t) => (
                <Card key={t.id} className="p-4 shadow-none">
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
    </AppShell>
  );
}