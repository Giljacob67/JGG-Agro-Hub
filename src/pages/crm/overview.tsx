import { Link } from "wouter";
import {
  AlertTriangle,
  Building2,
  CheckSquare,
  Scale,
  Target,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/crm/dashboard-section";
import { KpiCard } from "@/components/crm/kpi-card";
import { PracticeBreakdownTable } from "@/components/crm/practice-breakdown";
import { QuickActions } from "@/components/crm/quick-actions";
import { CrmErrorState } from "@/components/crm/loading-state";
import { useAuth } from "@/contexts/use-auth";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmStats } from "@/hooks/use-crm-queries";
import { formatBrl } from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";

const MODULES = [
  {
    label: "Leads Agro",
    desc: "Prospecção e qualificação comercial",
    icon: UserPlus,
    href: ROUTES.crm.leads,
    resource: "leads",
  },
  {
    label: "Contas / Clientes",
    desc: "Carteira ativa e relacionamento",
    icon: Building2,
    href: ROUTES.crm.accounts,
    resource: "accounts",
  },
  {
    label: "Oportunidades",
    desc: "Pipeline comercial em aberto",
    icon: Target,
    href: ROUTES.crm.opportunities,
    resource: "opportunities",
  },
  {
    label: "Demandas jurídicas",
    desc: "Matters, prazos e riscos",
    icon: Scale,
    href: ROUTES.crm.matters,
    resource: "matters",
  },
  {
    label: "Tarefas",
    desc: "Ações comercial, jurídica e operacional",
    icon: CheckSquare,
    href: ROUTES.crm.tasks,
    resource: "tasks",
  },
];

export default function CrmOverviewPage() {
  usePageTitle("CRM Agro");
  const { data: stats, isLoading, isError, error } = useCrmStats();
  const { canAccess } = useAuth();

  const visibleModules = MODULES.filter((m) => canAccess(m.resource));
  const alertCount = stats
    ? stats.riskAlerts.length + stats.overdueTasks
    : 0;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CRM Agro</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Visão consolidada da operação comercial e jurídica do agronegócio —
              leads, contas, pipeline, demandas e tarefas.
            </p>
          </div>
          <QuickActions />
        </header>

        {isError && <CrmErrorState error={error} />}

        {!isLoading && stats && alertCount > 0 && (
          <div className="rounded-xl border border-accent/30 bg-accent/8 px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">{alertCount} alertas</span> de prazo
              e risco — consulte o{" "}
              <Link href={ROUTES.commandCenter} className="text-primary hover:underline">
                dashboard executivo
              </Link>
              .
            </p>
          </div>
        )}

        {!isLoading && stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Leads ativos"
                value={stats.activeLeads}
                icon={UserPlus}
                href={ROUTES.crm.leads}
              />
              <KpiCard
                label="Contas"
                value={stats.activeAccounts}
                icon={Building2}
                href={ROUTES.crm.accounts}
              />
              <KpiCard
                label="Pipeline"
                value={formatBrl(stats.pipelineValue)}
                icon={Target}
                href={ROUTES.crm.opportunities}
                highlight
              />
              <KpiCard
                label="Demandas ativas"
                value={stats.activeMatters}
                icon={Scale}
                href={ROUTES.crm.matters}
              />
            </div>

            <DashboardSection title="Carteira por área de atuação">
              <PracticeBreakdownTable items={stats.practiceBreakdown} limit={5} />
            </DashboardSection>
          </>
        )}

        <section>
          <h2 className="text-lg font-bold mb-4">Módulos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleModules.map((mod) => (
              <Link key={mod.href} href={mod.href}>
                <div className="rounded-xl border border-border p-4 hover:border-primary/30 transition-colors h-full">
                  <mod.icon className="w-5 h-5 text-primary mb-3" />
                  <p className="text-sm font-semibold">{mod.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{mod.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
