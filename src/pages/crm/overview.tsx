import { Link } from "wouter";
import {
  Building2,
  CheckSquare,
  Scale,
  Target,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { KpiCard } from "@/components/crm/kpi-card";
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
  const { data: stats, isLoading } = useCrmStats();

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold">CRM Agro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada da operação comercial e jurídica do agronegócio.
          </p>
        </header>

        {!isLoading && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Leads ativos" value={stats.activeLeads} icon={UserPlus} href={ROUTES.crm.leads} />
            <KpiCard label="Oportunidades abertas" value={stats.openOpportunities} icon={Target} href={ROUTES.crm.opportunities} />
            <KpiCard label="Pipeline" value={formatBrl(stats.pipelineValue)} icon={Target} href={ROUTES.crm.opportunities} />
            <KpiCard label="Demandas ativas" value={stats.activeMatters} icon={Scale} href={ROUTES.crm.matters} />
          </div>
        )}

        <section>
          <h2 className="text-lg font-bold mb-4">Módulos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map((mod) => (
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