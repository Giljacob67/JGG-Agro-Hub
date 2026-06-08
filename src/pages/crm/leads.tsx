import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { EntityTable } from "@/components/crm/entity-table";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { MOCK_LEADS } from "@/lib/crm-mock-data";
import { LEAD_STATUS, formatDate, isWithinDays } from "@/lib/crm-labels";

export default function CrmLeadsPage() {
  usePageTitle("Leads Agro");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_LEADS.filter((l) => {
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q) ||
        l.owner.toLowerCase().includes(q) ||
        l.crop.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Leads Agro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prospecção e qualificação — relacionamento comercial inicial com
            produtores, cooperativas e operações do agronegócio.
          </p>
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
              cell: (r) => <span className="font-medium">{r.name}</span>,
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
      </div>
    </AppShell>
  );
}