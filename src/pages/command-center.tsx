import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckSquare,
  DollarSign,
  Scale,
  Target,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { KpiCard } from "@/components/crm/kpi-card";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { Card, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmStats } from "@/hooks/use-crm-queries";
import {
  formatBrl,
  formatDate,
  isOverdue,
  OPPORTUNITY_PRIORITY,
  RISK_LEVEL,
} from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";
import { JGG_AGRO_HUB_NAME, JGG_GROUP_NAME } from "@/lib/brand";

export default function CommandCenterPage() {
  usePageTitle("Mesa de Operações");
  const { data: stats, isLoading } = useCrmStats();

  if (isLoading || !stats) {
    return (
      <AppShell>
        <CrmLoadingState label="Carregando painel operacional…" />
      </AppShell>
    );
  }

  const alertCount = stats.riskAlerts.length + stats.overdueTasks;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
            {JGG_GROUP_NAME}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
            Mesa de Operações
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Painel operacional do {JGG_AGRO_HUB_NAME} — carteira comercial,
            demandas jurídicas e tarefas do time Agro.
          </p>
        </header>

        {alertCount > 0 && (
          <div className="rounded-xl border border-accent/30 bg-accent/8 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold">
                  Alertas de risco e urgência ({alertCount})
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  {stats.riskAlerts.map((m) => (
                    <li key={m.id}>
                      <span className="font-medium text-foreground">
                        {m.title}
                      </span>{" "}
                      — prazo {formatDate(m.deadline)} · risco{" "}
                      {RISK_LEVEL[m.risk].toLowerCase()}
                    </li>
                  ))}
                  {stats.overdueTasksList.map((t) => (
                    <li key={t.id}>
                      Tarefa vencida:{" "}
                      <span className="font-medium text-foreground">
                        {t.title}
                      </span>{" "}
                      — {formatDate(t.dueDate)}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link href={ROUTES.crm.matters}>
                    Ver demandas <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            label="Leads ativos"
            value={stats.activeLeads}
            icon={UserPlus}
            href={ROUTES.crm.leads}
          />
          <KpiCard
            label="Oportunidades abertas"
            value={stats.openOpportunities}
            icon={Target}
            href={ROUTES.crm.opportunities}
          />
          <KpiCard
            label="Valor em pipeline"
            value={formatBrl(stats.pipelineValue)}
            sublabel="Oportunidades em aberto"
            icon={DollarSign}
            href={ROUTES.crm.opportunities}
            highlight
          />
          <KpiCard
            label="Demandas em andamento"
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
            sublabel="Próximas do vencimento"
            icon={CalendarClock}
            href={ROUTES.crm.tasks}
          />
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Pipeline por fase</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={ROUTES.crm.opportunities}>
                Ver oportunidades <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.pipelineByStage.map((stage) => (
              <Card key={stage.id} className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {stage.label}
                </p>
                <p className="text-xl font-bold mt-1 tabular-nums">
                  {stage.count}
                </p>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {formatBrl(stage.value)}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Oportunidades prioritárias</h2>
              <Badge variant="muted">{stats.priorityOpportunities.length}</Badge>
            </div>
            <div className="space-y-3">
              {stats.priorityOpportunities.map((o) => (
                <Card key={o.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug">
                        {o.title}
                      </p>
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
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Próximos contatos</h2>
              <Badge variant="muted">{stats.upcomingContacts.length}</Badge>
            </div>
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
                        <p className="text-sm font-semibold">{c.accountOrLead}</p>
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
          </section>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-lg font-bold mb-4">
              Demandas com prazo próximo
            </h2>
            <div className="space-y-3">
              {stats.upcomingMatters.slice(0, 5).map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{m.title}</p>
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
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">Tarefas críticas</h2>
            <div className="space-y-3">
              {[...stats.overdueTasksList, ...stats.upcomingTasksList]
                .slice(0, 6)
                .map((t) => (
                  <Card key={t.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {t.title}
                        </p>
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
          </section>
        </div>

        <Card className="p-4 bg-muted/30 border-dashed">
          <CardDescription className="text-xs">
            Dados servidos via API Agro (store em memória). Integração PostgreSQL
            e autenticação SSO em fase posterior.
          </CardDescription>
        </Card>
      </div>
    </AppShell>
  );
}