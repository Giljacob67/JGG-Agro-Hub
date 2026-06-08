import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { FilterSelect } from "@/components/crm/filter-select";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { CrmPagination } from "@/components/crm/crm-pagination";
import { EntityTable } from "@/components/crm/entity-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateLeadForm } from "@/components/crm/create-lead-form";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmListPage } from "@/hooks/use-crm-list-page";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useLeads } from "@/hooks/use-crm-queries";
import { DEFAULT_PAGE_SIZE } from "@shared/agro/list-types";
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

  const debouncedSearch = useDebouncedValue(search);
  const { page, setPage } = useCrmListPage(
    debouncedSearch,
    statusFilter,
    regionFilter,
    sourceFilter,
    cropFilter,
    ownerFilter,
  );

  const listParams = useMemo(
    () => ({
      facets: true,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      status: statusFilter !== FILTER_ALL ? statusFilter : undefined,
      region: regionFilter !== FILTER_ALL ? regionFilter : undefined,
      source: sourceFilter !== FILTER_ALL ? sourceFilter : undefined,
      crop: cropFilter !== FILTER_ALL ? cropFilter : undefined,
      owner: ownerFilter !== FILTER_ALL ? ownerFilter : undefined,
    }),
    [
      page,
      debouncedSearch,
      statusFilter,
      regionFilter,
      sourceFilter,
      cropFilter,
      ownerFilter,
    ],
  );

  const { data, isLoading } = useLeads(listParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets;

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
        </header>
        <CreateLeadForm />
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
          <CrmLoadingState />
        ) : (
          <EntityTable
            data={items}
            isFiltered={isFiltered}
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
        {!isLoading && (
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