import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { FilterSelect } from "@/components/crm/filter-select";
import { CrmTableSkeleton, CrmErrorState } from "@/components/crm/loading-state";
import { CrmPagination } from "@/components/crm/crm-pagination";
import { EntityTable } from "@/components/crm/entity-table";
import { BulkActionsBar } from "@/components/crm/bulk-actions-bar";
import { SavedViewsBar } from "@/components/crm/saved-views-bar";
import { CreateMatterForm } from "@/components/crm/create-matter-form";
import { ExportCsvButton } from "@/components/crm/export-csv-button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmListPage } from "@/hooks/use-crm-list-page";
import { useTableSort } from "@/hooks/use-table-sort";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useBulkApply } from "@/hooks/use-bulk-apply";
import { useSavedViews } from "@/hooks/use-saved-views";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMatters, useUpdateMatter } from "@/hooks/use-crm-queries";
import { DEFAULT_PAGE_SIZE, type SortDir } from "@shared/agro/list-types";
import {
  MATTER_STATUS,
  RISK_LEVEL,
  formatDate,
  isCriticalDeadline,
  riskBadgeVariant,
} from "@/lib/crm-labels";
import { FILTER_ALL, hasActiveFilters } from "@/lib/crm-filter-helpers";
import { ROUTES } from "@/lib/routes";
import type { MatterStatus, RiskLevel } from "@shared/agro/types";

interface MattersView {
  search: string;
  statusFilter: string;
  riskFilter: string;
  practiceFilter: string;
  ownerFilter: string;
  deadlineFilter: string;
  sort?: string;
  dir?: SortDir;
}

export default function CrmMattersPage() {
  usePageTitle("Demandas jurídicas");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [riskFilter, setRiskFilter] = useState(FILTER_ALL);
  const [practiceFilter, setPracticeFilter] = useState(FILTER_ALL);
  const [ownerFilter, setOwnerFilter] = useState(FILTER_ALL);
  const [deadlineFilter, setDeadlineFilter] = useState(FILTER_ALL);

  const debouncedSearch = useDebouncedValue(search);
  const { sort, dir, onSort, setSort } = useTableSort();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { page, setPage } = useCrmListPage(
    debouncedSearch,
    statusFilter,
    riskFilter,
    practiceFilter,
    ownerFilter,
    deadlineFilter,
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
      status: statusFilter !== FILTER_ALL ? statusFilter : undefined,
      risk: riskFilter !== FILTER_ALL ? riskFilter : undefined,
      practice: practiceFilter !== FILTER_ALL ? practiceFilter : undefined,
      owner: ownerFilter !== FILTER_ALL ? ownerFilter : undefined,
      deadline: deadlineFilter !== FILTER_ALL ? deadlineFilter : undefined,
      sort,
      dir,
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      statusFilter,
      riskFilter,
      practiceFilter,
      ownerFilter,
      deadlineFilter,
      sort,
      dir,
    ],
  );

  const { data, isLoading, isError, error } = useMatters(listParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets;

  const selection = useRowSelection(items.map((i) => i.id));
  const updateMatter = useUpdateMatter();
  const bulk = useBulkApply();

  const isFiltered = hasActiveFilters(
    { statusFilter, riskFilter, practiceFilter, ownerFilter, deadlineFilter },
    search,
  );

  const savedViews = useSavedViews<MattersView>("matters");
  const currentView: MattersView = {
    search,
    statusFilter,
    riskFilter,
    practiceFilter,
    ownerFilter,
    deadlineFilter,
    sort,
    dir,
  };
  const applyView = (v: MattersView) => {
    setSearch(v.search);
    setStatusFilter(v.statusFilter);
    setRiskFilter(v.riskFilter);
    setPracticeFilter(v.practiceFilter);
    setOwnerFilter(v.ownerFilter);
    setDeadlineFilter(v.deadlineFilter);
    setSort(v.sort, v.dir);
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Demandas jurídicas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Matters em aberto — prazos, riscos e status operacional.
            </p>
          </div>
          <div className="flex gap-2">
            <ExportCsvButton resource="matters" />
            <CreateMatterForm />
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
          placeholder="Buscar demanda..."
          filteredCount={items.length}
          totalCount={total}
        >
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            label="Filtrar por status"
            options={[
              { value: FILTER_ALL, label: "Todos os status" },
              ...(Object.entries(MATTER_STATUS) as [MatterStatus, string][]).map(
                ([value, label]) => ({ value, label }),
              ),
            ]}
          />
          <FilterSelect
            value={riskFilter}
            onChange={setRiskFilter}
            label="Filtrar por risco"
            options={[
              { value: FILTER_ALL, label: "Todos os riscos" },
              ...(Object.entries(RISK_LEVEL) as [RiskLevel, string][]).map(
                ([value, label]) => ({ value, label }),
              ),
            ]}
          />
          <FilterSelect
            value={practiceFilter}
            onChange={setPracticeFilter}
            label="Filtrar por área jurídica"
            options={[
              { value: FILTER_ALL, label: "Todas as áreas" },
              ...(facets?.practices ?? []).map((p) => ({ value: p, label: p })),
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
          <FilterSelect
            value={deadlineFilter}
            onChange={setDeadlineFilter}
            label="Filtrar por prazo"
            options={[
              { value: FILTER_ALL, label: "Todos os prazos" },
              { value: "vencidas", label: "Vencidas" },
              { value: "proximas", label: "Próximas (7 dias)" },
              { value: "criticas", label: "Críticas" },
            ]}
          />
        </CrmFilters>
        {isLoading ? (
          <CrmTableSkeleton cols={6} />
        ) : isError ? (
          <CrmErrorState error={error} />
        ) : (
          <>
          <BulkActionsBar
            count={selection.count}
            isPending={bulk.isPending}
            onClear={selection.clear}
            actions={[
              {
                id: "status",
                label: "Alterar status",
                options: (
                  Object.entries(MATTER_STATUS) as [MatterStatus, string][]
                ).map(([value, label]) => ({ value, label })),
                onApply: (value) =>
                  bulk.apply(
                    selection.selectedIds,
                    (id) =>
                      updateMatter.mutateAsync({
                        id,
                        patch: { status: value as MatterStatus },
                      }),
                    selection.clear,
                  ),
              },
              {
                id: "risk",
                label: "Alterar risco",
                options: (
                  Object.entries(RISK_LEVEL) as [RiskLevel, string][]
                ).map(([value, label]) => ({ value, label })),
                onApply: (value) =>
                  bulk.apply(
                    selection.selectedIds,
                    (id) =>
                      updateMatter.mutateAsync({
                        id,
                        patch: { risk: value as RiskLevel },
                      }),
                    selection.clear,
                  ),
              },
            ]}
          />
          <EntityTable
            data={items}
            isFiltered={isFiltered}
            sort={sort}
            dir={dir}
            onSort={onSort}
            selectable
            selectedIds={selection.selected}
            onToggleRow={selection.toggle}
            onToggleAll={selection.toggleAll}
            allSelected={selection.allSelected}
            someSelected={selection.someSelected}
            getRowClassName={(r) =>
              isCriticalDeadline(r.deadline, r.risk, r.status)
                ? "bg-red-50/60 dark:bg-red-950/20"
                : undefined
            }
            columns={[
              {
                key: "title",
                header: "Demanda",
                sortKey: "title",
                cell: (r) => (
                  <Link
                    href={ROUTES.crm.matterDetail(r.id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.title}
                  </Link>
                ),
              },
              { key: "account", header: "Conta", sortKey: "accountName", cell: (r) => r.accountName },
              { key: "practice", header: "Área", sortKey: "practice", cell: (r) => r.practice },
              {
                key: "status",
                header: "Status",
                sortKey: "status",
                cell: (r) => (
                  <Badge variant="outline">{MATTER_STATUS[r.status]}</Badge>
                ),
              },
              {
                key: "risk",
                header: "Risco",
                sortKey: "risk",
                cell: (r) => (
                  <Badge variant={riskBadgeVariant(r.risk)}>
                    {RISK_LEVEL[r.risk]}
                  </Badge>
                ),
              },
              {
                key: "deadline",
                header: "Prazo",
                sortKey: "deadline",
                cell: (r) => (
                  <span
                    className={
                      isCriticalDeadline(r.deadline, r.risk, r.status)
                        ? "text-red-700 dark:text-red-400 font-medium"
                        : ""
                    }
                  >
                    {formatDate(r.deadline)}
                  </span>
                ),
              },
              { key: "owner", header: "Responsável", sortKey: "owner", cell: (r) => r.owner },
            ]}
          />
          </>
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