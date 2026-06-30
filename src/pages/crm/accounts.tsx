import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { FilterSelect } from "@/components/crm/filter-select";
import { CrmTableSkeleton, CrmErrorState } from "@/components/crm/loading-state";
import { CrmPagination } from "@/components/crm/crm-pagination";
import { EntityTable } from "@/components/crm/entity-table";
import { SavedViewsBar } from "@/components/crm/saved-views-bar";
import { CreateAccountForm } from "@/components/crm/create-account-form";
import { ExportCsvButton } from "@/components/crm/export-csv-button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmListPage } from "@/hooks/use-crm-list-page";
import { useTableSort } from "@/hooks/use-table-sort";
import { useSavedViews } from "@/hooks/use-saved-views";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAccounts } from "@/hooks/use-crm-queries";
import { DEFAULT_PAGE_SIZE, type SortDir } from "@shared/agro/list-types";
import { ACCOUNT_TYPE } from "@/lib/crm-labels";
import { FILTER_ALL, hasActiveFilters } from "@/lib/crm-filter-helpers";
import { ROUTES } from "@/lib/routes";
import type { AccountType } from "@shared/agro/types";

interface AccountsView {
  search: string;
  typeFilter: string;
  regionFilter: string;
  ownerFilter: string;
  sort?: string;
  dir?: SortDir;
}

export default function CrmAccountsPage() {
  usePageTitle("Contas Agro");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  const [regionFilter, setRegionFilter] = useState(FILTER_ALL);
  const [ownerFilter, setOwnerFilter] = useState(FILTER_ALL);

  const debouncedSearch = useDebouncedValue(search);
  const { sort, dir, onSort, setSort } = useTableSort();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { page, setPage } = useCrmListPage(
    debouncedSearch,
    typeFilter,
    regionFilter,
    ownerFilter,
    sort,
    dir,
    pageSize,
  );

  const listParams = useMemo(
    () => ({
      facets: true,
      page,
      pageSize,
      search: debouncedSearch.trim() || undefined,
      type: typeFilter !== FILTER_ALL ? typeFilter : undefined,
      region: regionFilter !== FILTER_ALL ? regionFilter : undefined,
      owner: ownerFilter !== FILTER_ALL ? ownerFilter : undefined,
      sort,
      dir,
    }),
    [page, pageSize, debouncedSearch, typeFilter, regionFilter, ownerFilter, sort, dir],
  );

  const { data, isLoading, isError, error } = useAccounts(listParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets;

  const isFiltered = hasActiveFilters(
    { typeFilter, regionFilter, ownerFilter },
    search,
  );

  const savedViews = useSavedViews<AccountsView>("accounts");
  const currentView: AccountsView = {
    search,
    typeFilter,
    regionFilter,
    ownerFilter,
    sort,
    dir,
  };
  const applyView = (v: AccountsView) => {
    setSearch(v.search);
    setTypeFilter(v.typeFilter);
    setRegionFilter(v.regionFilter);
    setOwnerFilter(v.ownerFilter);
    setSort(v.sort, v.dir);
  };

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
        <SavedViewsBar
          views={savedViews.views}
          currentState={currentView}
          isEmptyState={!isFiltered && !sort}
          onApply={applyView}
          onSave={(name) => savedViews.save(name, currentView)}
          onRemove={savedViews.remove}
        />
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
            sort={sort}
            dir={dir}
            onSort={onSort}
            columns={[
              {
                key: "name",
                header: "Conta",
                sortKey: "name",
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
                sortKey: "type",
                cell: (r) => (
                  <Badge variant="secondary">{ACCOUNT_TYPE[r.type]}</Badge>
                ),
              },
              { key: "region", header: "Região", sortKey: "region", cell: (r) => r.region },
              {
                key: "area",
                header: "Área (ha)",
                sortKey: "areaHa",
                cell: (r) => (r.areaHa ? r.areaHa.toLocaleString("pt-BR") : "—"),
              },
              { key: "matters", header: "Demandas", sortKey: "activeMatters", cell: (r) => r.activeMatters },
              {
                key: "opps",
                header: "Oportunidades",
                sortKey: "activeOpportunities",
                cell: (r) => r.activeOpportunities,
              },
              { key: "owner", header: "Responsável", sortKey: "owner", cell: (r) => r.owner },
            ]}
          />
        )}
        {!isLoading && !isError && (
          <CrmPagination
            page={data?.page ?? page}
            pageSize={data?.pageSize ?? pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </AppShell>
  );
}