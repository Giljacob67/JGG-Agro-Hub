import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { EntityTable } from "@/components/crm/entity-table";
import { Badge } from "@/components/ui/badge";
import { MOCK_LEADS } from "@/lib/crm-mock-data";
import { LEAD_STATUS, formatDate } from "@/lib/crm-labels";

export default function CrmLeadsPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_LEADS.filter(
      (l) =>
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q) ||
        l.owner.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Leads Agro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prospecção e qualificação — relacionamento comercial inicial.
          </p>
        </header>
        <CrmFilters
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar lead, região ou responsável..."
        />
        <EntityTable
          data={filtered}
          columns={[
            { key: "id", header: "ID", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
            { key: "name", header: "Nome", cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "region", header: "Região", cell: (r) => r.region },
            { key: "crop", header: "Cultura", cell: (r) => r.crop },
            { key: "status", header: "Status", cell: (r) => <Badge variant="outline">{LEAD_STATUS[r.status]}</Badge> },
            { key: "owner", header: "Responsável", cell: (r) => r.owner },
            { key: "created", header: "Criado", cell: (r) => formatDate(r.createdAt) },
          ]}
        />
      </div>
    </AppShell>
  );
}