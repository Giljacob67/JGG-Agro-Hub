import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { FilterSelect } from "@/components/crm/filter-select";
import { CrmTableSkeleton, CrmErrorState } from "@/components/crm/loading-state";
import { CrmPagination } from "@/components/crm/crm-pagination";
import { EntityTable } from "@/components/crm/entity-table";
import { CreateAccountForm } from "@/components/crm/create-account-form";
import { ExportCsvButton } from "@/components/crm/export-csv-button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmListPage } from "@/hooks/use-crm-list-page";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAccounts } from "@/hooks/use-crm-queries";
import { DEFAULT_PAGE_SIZE } from "@shared/agro/list-types";
import { ACCOUNT_TYPE } from "@/lib/crm-labels";
import { FILTER_ALL, hasActiveFilters } from "@/lib/crm-filter-helpers";
import { ROUTES } from "@/lib/routes";
import type { AccountType } from "@shared/agro/types";

export default function CrmAccountsPage() {
  usePageTitle("Contas Agro");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  const [regionFilter, setRegionFilter] = useState(FILTER_ALL);
  const [ownerFilter, setOwnerFilter] = useState(FILTER_ALL);

  const debouncedSearch = useDebouncedValue(search);
  const { page, setPage } = useCrmListPage(
    debouncedSearch,
    typeFilter,
    regionFilter,
    ownerFilter,
  );

  const listParams = useMemo(
    () => ({
      facets: true,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      type: typeFilter !== FILTER_ALL ? typeFilter : undefined,
      region: regionFilter !== FILTER_ALL ? regionFilter : undefined,
      owner: ownerFilter !== FILTER_ALL ? ownerFilter : undefined,
    }),
    [page, debouncedSearch, typeFilter, regionFilter, ownerFilter],
  );

  const { data, isLoading, isError, error } = useAccounts(listParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets;

  const isFiltered = hasActiveFilters(
    { typeFilter, regionFilter, ownerFilter },
    search,
  );

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contas / Clientes Agro</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Carteira ativa do JGG Group — produtores, cooperativas e operações.
            </p>
          </div>
          <div className="flex gap-2">
            <ExportCsvButton resource="accounts" />
            <CreateAccountForm />
          </div>
        </header>
        <CrmFilters
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar conta ou região..."
          filteredCount={items.length}
          totalCount={total}
        >
          <FilterSelect
            value={typeFilter}
            onChange={setTypeFilter}
            label="Filtrar por tipo"
            options={[
              { value: FILTER_ALL, label: "Todos os tipos" },
              ...(Object.entries(ACCOUNT_TYPE) as [AccountType, string][]).map(
                ([value, label]) => ({ value, label }),
              ),
            ]}
          />
          <FilterSelect
            value={regionFilter}
            onChange={setRegionFilter}
            label="Filtrar por região"
            options={[
              { value: FILTER_ALL, label: "Todas as regiões" },
              ...(facets?.regions ?? []).map((r) => ({ value: r, label: r })),
            ]}
          />
          <FilterSelect
            value={ownerFilter}
            onChange={setOwnerFilter}
            label="Filtrar por responsável"
            options={[
              { value: FILTER_ALL, label: "Todos os responsáveis" },
              ...(facets?.owners ?? []).map((o) => ({ value: o, label: o })),
            ]}
          />
        </CrmFilters>
        {isLoading ? (
          <CrmTableSkeleton cols={6} />
        ) : isError ? (
          <CrmErrorState error={error} />
        ) : (
          <EntityTable
            data={items}
            isFiltered={isFiltered}
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
              {
                key: "type",
                header: "Tipo",
                cell: (r) => (
                  <Badge variant="secondary">{ACCOUNT_TYPE[r.type]}</Badge>
                ),
              },
              { key: "region", header: "Região", cell: (r) => r.region },
              {
                key: "area",
                header: "Área (ha)",
                cell: (r) => (r.areaHa ? r.areaHa.toLocaleString("pt-BR") : "—"),
              },
              { key: "matters", header: "Demandas", cell: (r) => r.activeMatters },
              {
                key: "opps",
                header: "Oportunidades",
                cell: (r) => r.activeOpportunities,
              },
              { key: "owner", header: "Responsável", cell: (r) => r.owner },
            ]}
          />
        )}
        {!isLoading && !isError && (
          <CrmPagination
            page={data?.page ?? page}
            pageSize={data?.pageSize ?? DEFAULT_PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>
    </AppShell>
  );
}