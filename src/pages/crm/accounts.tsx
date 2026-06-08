import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { EntityTable } from "@/components/crm/entity-table";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAccounts } from "@/hooks/use-crm-queries";
import { ACCOUNT_TYPE } from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";

export default function CrmAccountsPage() {
  usePageTitle("Contas Agro");
  const { data: accounts = [], isLoading } = useAccounts();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return accounts.filter(
      (a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.region.toLowerCase().includes(q),
    );
  }, [accounts, search]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Contas / Clientes Agro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Carteira ativa do JGG Group — produtores, cooperativas e operações.
          </p>
        </header>
        <CrmFilters search={search} onSearchChange={setSearch} placeholder="Buscar conta ou região..." />
        {isLoading ? (
          <CrmLoadingState />
        ) : (
          <EntityTable
            data={filtered}
            columns={[
              {
                key: "name",
                header: "Conta",
                cell: (r) => (
                  <Link
                    href={ROUTES.crm.accountDetail(r.id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.name}
                  </Link>
                ),
              },
              { key: "type", header: "Tipo", cell: (r) => <Badge variant="secondary">{ACCOUNT_TYPE[r.type]}</Badge> },
              { key: "region", header: "Região", cell: (r) => r.region },
              { key: "area", header: "Área (ha)", cell: (r) => (r.areaHa ? r.areaHa.toLocaleString("pt-BR") : "—") },
              { key: "matters", header: "Demandas", cell: (r) => r.activeMatters },
              { key: "opps", header: "Oportunidades", cell: (r) => r.activeOpportunities },
              { key: "owner", header: "Responsável", cell: (r) => r.owner },
            ]}
          />
        )}
      </div>
    </AppShell>
  );
}