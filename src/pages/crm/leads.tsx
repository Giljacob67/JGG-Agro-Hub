import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { EntityTable } from "@/components/crm/entity-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLeads } from "@/hooks/use-crm-queries";
import { LEAD_STATUS, formatDate, isWithinDays } from "@/lib/crm-labels";
import { exportToCsv } from "@/lib/export-csv";
import { ROUTES } from "@/lib/routes";

export default function CrmLeadsPage() {
  usePageTitle("Leads Agro");
  const { data: leads = [], isLoading } = useLeads();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) => {
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q) ||
        l.owner.toLowerCase().includes(q) ||
        l.crop.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Leads Agro</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Prospecção e qualificação — relacionamento comercial inicial.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCsv(filtered, "leads-agro.csv", [
                { key: "id", header: "ID" },
                { key: "name", header: "Nome" },
                { key: "region", header: "Região" },
                { key: "crop", header: "Cultura" },
                { key: "status", header: "Status" },
                { key: "owner", header: "Responsável" },
                { key: "nextContact", header: "Próximo contato" },
              ])
            }
            disabled={filtered.length === 0}
          >
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </Button>
        </header>
        <CrmFilters
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar lead, região, cultura ou responsável..."
        >
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Filtrar por status"
          >
            <option value="all">Todos os status</option>
            <option value="novo">Novo</option>
            <option value="qualificando">Qualificando</option>
            <option value="qualificado">Qualificado</option>
            <option value="descartado">Descartado</option>
          </select>
        </CrmFilters>
        {isLoading ? (
          <CrmLoadingState />
        ) : (
          <EntityTable
            data={filtered}
            columns={[
              {
                key: "id",
                header: "ID",
                cell: (r) => <span className="font-mono text-xs">{r.id}</span>,
              },
              {
                key: "name",
                header: "Nome",
                cell: (r) => (
                  <Link
                    href={ROUTES.crm.leadDetail(r.id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.name}
                  </Link>
                ),
              },
              { key: "region", header: "Região", cell: (r) => r.region },
              { key: "crop", header: "Cultura / operação", cell: (r) => r.crop },
              {
                key: "status",
                header: "Status",
                cell: (r) => (
                  <Badge variant="outline">{LEAD_STATUS[r.status]}</Badge>
                ),
              },
              { key: "owner", header: "Responsável", cell: (r) => r.owner },
              {
                key: "nextContact",
                header: "Próximo contato",
                cell: (r) =>
                  r.nextContact ? (
                    <span
                      className={
                        isWithinDays(r.nextContact, 3)
                          ? "font-medium text-foreground"
                          : ""
                      }
                    >
                      {formatDate(r.nextContact)}
                    </span>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "created",
                header: "Criado",
                cell: (r) => formatDate(r.createdAt),
              },
            ]}
          />
        )}
      </div>
    </AppShell>
  );
}