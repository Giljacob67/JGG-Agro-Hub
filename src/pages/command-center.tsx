import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckSquare,
  Scale,
  Target,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MOCK_LEADS,
  MOCK_OPPORTUNITIES,
  MOCK_MATTERS,
  MOCK_TASKS,
  OPPORTUNITY_STAGES,
} from "@/lib/crm-mock-data";
import { formatDate, isOverdue, RISK_LEVEL } from "@/lib/crm-labels";
import { JGG_AGRO_HUB_NAME, JGG_GROUP_NAME } from "@/lib/brand";

export default function CommandCenterPage() {
  const activeLeads = MOCK_LEADS.filter((l) => l.status !== "descartado");
  const urgentMatters = MOCK_MATTERS.filter(
    (m) => m.risk === "alto" || m.risk === "critico",
  );
  const overdueTasks = MOCK_TASKS.filter(
    (t) => t.status === "atrasada" || isOverdue(t.dueDate),
  );
  const pipeline = OPPORTUNITY_STAGES.filter((s) => s.id !== "perdido").map(
    (stage) => ({
      ...stage,
      count: MOCK_OPPORTUNITIES.filter((o) => o.stage === stage.id).length,
    }),
  );

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
            Visão operacional do {JGG_AGRO_HUB_NAME} — leads, oportunidades,
            demandas jurídicas e tarefas do time. Uso interno.
          </p>
        </header>

        {(urgentMatters.length > 0 || overdueTasks.length > 0) && (
          <div className="rounded-xl border border-accent/30 bg-accent/8 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold">Alertas operacionais</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {urgentMatters.map((m) => (
                    <li key={m.id}>
                      <span className="font-medium text-foreground">
                        {m.title}
                      </span>{" "}
                      — prazo {formatDate(m.deadline)} (
                      {RISK_LEVEL[m.risk]})
                    </li>
                  ))}
                  {overdueTasks.map((t) => (
                    <li key={t.id}>
                      Tarefa atrasada:{" "}
                      <span className="font-medium text-foreground">
                        {t.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Leads ativos",
              value: activeLeads.length,
              icon: UserPlus,
              href: "/crm/leads",
            },
            {
              label: "Oportunidades",
              value: MOCK_OPPORTUNITIES.length,
              icon: Target,
              href: "/crm/opportunities",
            },
            {
              label: "Demandas jurídicas",
              value: MOCK_MATTERS.length,
              icon: Scale,
              href: "/crm/matters",
            },
            {
              label: "Tarefas abertas",
              value: MOCK_TASKS.filter((t) => t.status !== "concluida").length,
              icon: CheckSquare,
              href: "/crm/tasks",
            },
          ].map((kpi) => (
            <Link key={kpi.href} href={kpi.href}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
                <CardHeader className="p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <kpi.icon className="w-4 h-4 text-primary" />
                    <span className="text-2xl font-bold">{kpi.value}</span>
                  </div>
                  <CardTitle className="text-sm font-medium mt-2">
                    {kpi.label}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Pipeline comercial</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/opportunities">
                Ver oportunidades <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pipeline.map((stage) => (
              <Card key={stage.id} className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {stage.label}
                </p>
                <p className="text-xl font-bold mt-1">{stage.count}</p>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-lg font-bold mb-4">Demandas com prazo próximo</h2>
            <div className="space-y-3">
              {MOCK_MATTERS.slice(0, 4).map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.accountName} · {m.practice}
                      </p>
                    </div>
                    <Badge variant={m.risk === "critico" ? "danger" : m.risk === "alto" ? "warning" : "outline"}>
                      {formatDate(m.deadline)}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">Próximas tarefas</h2>
            <div className="space-y-3">
              {MOCK_TASKS.filter((t) => t.status !== "concluida")
                .slice(0, 4)
                .map((t) => (
                  <Card key={t.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Briefcase className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {t.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.owner} · {formatDate(t.dueDate)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          t.status === "atrasada" ? "danger" : "outline"
                        }
                      >
                        {t.type}
                      </Badge>
                    </div>
                  </Card>
                ))}
            </div>
          </section>
        </div>

        <Card className="p-4 bg-muted/30 border-dashed">
          <CardDescription className="text-xs">
            Dados fictícios para operação interna. Integração com backend JGG
            Group em fase posterior.
          </CardDescription>
        </Card>
      </div>
    </AppShell>
  );
}