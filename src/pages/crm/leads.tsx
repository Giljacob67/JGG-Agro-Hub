import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Download, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { FilterSelect } from "@/components/crm/filter-select";
import { CrmTableSkeleton, CrmErrorState } from "@/components/crm/loading-state";
import { CrmPagination } from "@/components/crm/crm-pagination";
import { EntityTable } from "@/components/crm/entity-table";
import { BulkActionsBar } from "@/components/crm/bulk-actions-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateLeadForm } from "@/components/crm/create-lead-form";
import { LeadListsBar, LIST_ALL, LIST_NONE } from "@/components/crm/lead-lists-bar";
import { ImportLeadsDialog } from "@/components/crm/import-leads-dialog";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmListPage } from "@/hooks/use-crm-list-page";
import { useTableSort } from "@/hooks/use-table-sort";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useBulkApply } from "@/hooks/use-bulk-apply";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useLeads, useUpdateLead } from "@/hooks/use-crm-queries";
import { DEFAULT_PAGE_SIZE } from "@shared/agro/list-types";
import type { LeadStatus } from "@shared/agro/types";
import { LEAD_STATUS, formatDate, isWithinDays } from "@/lib/crm-labels";
import { FILTER_ALL, hasActiveFilters } from "@/lib/crm-filter-helpers";
import { exportToCsv } from "@/lib/export-csv";
import { ROUTES } from "@/lib/routes";

export default function CrmLeadsPage() {
  usePageTitle("Leads Agro");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [regionFilter, setRegionFilter] = useState(FILTER_ALL);
  const [sourceFilter, setSourceFilter] = useState(FILTER_ALL);
  const [cropFilter, setCropFilter] = useState(FILTER_ALL);
  const [ownerFilter, setOwnerFilter] = useState(FILTER_ALL);
  const [listFilter, setListFilter] = useState(LIST_ALL);
  const [importOpen, setImportOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const { sort, dir, onSort } = useTableSort();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { page, setPage } = useCrmListPage(
    debouncedSearch,
    statusFilter,
    regionFilter,
    sourceFilter,
    cropFilter,
    ownerFilter,
    listFilter,
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
      region: regionFilter !== FILTER_ALL ? regionFilter : undefined,
      source: sourceFilter !== FILTER_ALL ? sourceFilter : undefined,
      crop: cropFilter !== FILTER_ALL ? cropFilter : undefined,
      owner: ownerFilter !== FILTER_ALL ? ownerFilter : undefined,
      listId: listFilter !== LIST_ALL ? listFilter : undefined,
      sort,
      dir,
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      statusFilter,
      regionFilter,
      sourceFilter,
      cropFilter,
      ownerFilter,
      listFilter,
      sort,
      dir,
    ],
  );

  const { data, isLoading, isError, error } = useLeads(listParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets;

  const selection = useRowSelection(items.map((i) => i.id));
  const updateLead = useUpdateLead();
  const bulk = useBulkApply();

  const isFiltered = hasActiveFilters(
    { statusFilter, regionFilter, sourceFilter, cropFilter, ownerFilter },
    search,
  );

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCsv(items, "leads-agro.csv", [
                  { key: "id", header: "ID" },
                  { key: "name", header: "Nome" },
                  { key: "region", header: "Região" },
                  { key: "crop", header: "Cultura" },
                  { key: "status", header: "Status" },
                  { key: "owner", header: "Responsável" },
                  { key: "nextContact", header: "Próximo contato" },
                ])
              }
              disabled={items.length === 0}
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </Button>
          </div>
        </header>
        <ImportLeadsDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          defaultListId={
            listFilter !== LIST_ALL && listFilter !== LIST_NONE
              ? listFilter
              : null
          }
        />
        <LeadListsBar value={listFilter} onChange={setListFilter} />
        <CreateLeadForm
          listId={
            listFilter !== LIST_ALL && listFilter !== LIST_NONE
              ? listFilter
              : null
          }
        />
        <CrmFilters
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar lead, região, cultura ou responsável..."
          filteredCount={items.length}
          totalCount={total}
        >
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            label="Filtrar por status"
            options={[
              { value: FILTER_ALL, label: "Todos os status" },
              ...Object.entries(LEAD_STATUS).map(([value, label]) => ({
                value,
                label,
              })),
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
            value={sourceFilter}
            onChange={setSourceFilter}
            label="Filtrar por origem"
            options={[
              { value: FILTER_ALL, label: "Todas as origens" },
              ...(facets?.sources ?? []).map((s) => ({ value: s, label: s })),
            ]}
          />
          <FilterSelect
            value={cropFilter}
            onChange={setCropFilter}
            label="Filtrar por cultura"
            options={[
              { value: FILTER_ALL, label: "Todas as culturas" },
              ...(facets?.crops ?? []).map((c) => ({ value: c, label: c })),
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
          <>
          <BulkActionsBar
            count={selection.count}
            isPending={bulk.isPending}
            onClear={selection.clear}
            actions={[
              {
                id: "status",
                label: "Alterar status",
                options: Object.entries(LEAD_STATUS).map(([value, label]) => ({
                  value,
                  label,
                })),
                onApply: (value) =>
                  bulk.apply(
                    selection.selectedIds,
                    (id) =>
                      updateLead.mutateAsync({
                        id,
                        patch: { status: value as LeadStatus },
                      }),
                    selection.clear,
                  ),
              },
              {
                id: "owner",
                label: "Atribuir responsável",
                options: (facets?.owners ?? []).map((o) => ({
                  value: o,
                  label: o,
                })),
                onApply: (value) =>
                  bulk.apply(
                    selection.selectedIds,
                    (id) => updateLead.mutateAsync({ id, patch: { owner: value } }),
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
            columns={[
              {
                key: "id",
                header: "ID",
                cell: (r) => <span className="font-mono text-xs">{r.id}</span>,
              },
              {
                key: "name",
                header: "Nome",
                sortKey: "name",
                cell: (r) => (
                  <Link
                    href={ROUTES.crm.leadDetail(r.id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.name}
                  </Link>
                ),
              },
              { key: "region", header: "Região", sortKey: "region", cell: (r) => r.region },
              { key: "crop", header: "Cultura / operação", sortKey: "crop", cell: (r) => r.crop },
              {
                key: "status",
                header: "Status",
                sortKey: "status",
                cell: (r) => (
                  <Badge variant="outline">{LEAD_STATUS[r.status]}</Badge>
                ),
              },
              { key: "owner", header: "Responsável", sortKey: "owner", cell: (r) => r.owner },
              {
                key: "nextContact",
                header: "Próximo contato",
                sortKey: "nextContact",
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
                sortKey: "createdAt",
                cell: (r) => formatDate(r.createdAt),
              },
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