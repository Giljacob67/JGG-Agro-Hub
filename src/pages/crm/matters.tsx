import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { EntityTable } from "@/components/crm/entity-table";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useMatters } from "@/hooks/use-crm-queries";
import {
  MATTER_STATUS,
  RISK_LEVEL,
  formatDate,
  isOverdue,
  riskBadgeVariant,
} from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";

export default function CrmMattersPage() {
  usePageTitle("Demandas jurídicas");
  const { data: matters = [], isLoading } = useMatters();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return matters.filter((m) => {
      const matchSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.accountName.toLowerCase().includes(q) ||
        m.practice.toLowerCase().includes(q);
      const matchRisk = riskFilter === "all" || m.risk === riskFilter;
      return matchSearch && matchRisk;
    });
  }, [matters, search, riskFilter]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Demandas jurídicas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Matters em aberto — prazos, riscos e status operacional.
          </p>
        </header>
        <CrmFilters search={search} onSearchChange={setSearch} placeholder="Buscar demanda...">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Filtrar por risco"
          >
            <option value="all">Todos os riscos</option>
            <option value="critico">Crítico</option>
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </CrmFilters>
        {isLoading ? (
          <CrmLoadingState />
        ) : (
          <EntityTable
            data={filtered}
            columns={[
              {
                key: "title",
                header: "Demanda",
                cell: (r) => (
                  <Link
                    href={ROUTES.crm.matterDetail(r.id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.title}
                  </Link>
                ),
              },
              { key: "account", header: "Conta", cell: (r) => r.accountName },
              { key: "practice", header: "Área", cell: (r) => r.practice },
              { key: "status", header: "Status", cell: (r) => <Badge variant="outline">{MATTER_STATUS[r.status]}</Badge> },
              {
                key: "risk",
                header: "Risco",
                cell: (r) => <Badge variant={riskBadgeVariant(r.risk)}>{RISK_LEVEL[r.risk]}</Badge>,
              },
              {
                key: "deadline",
                header: "Prazo",
                cell: (r) => (
                  <span className={isOverdue(r.deadline) && r.status !== "concluida" ? "text-red-700 font-medium" : ""}>
                    {formatDate(r.deadline)}
                  </span>
                ),
              },
              { key: "owner", header: "Responsável", cell: (r) => r.owner },
            ]}
          />
        )}
      </div>
    </AppShell>
  );
}