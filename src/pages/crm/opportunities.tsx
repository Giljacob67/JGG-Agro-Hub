import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { FilterSelect } from "@/components/crm/filter-select";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { CrmPagination } from "@/components/crm/crm-pagination";
import { CreateOpportunityForm } from "@/components/crm/create-opportunity-form";
import { ExportCsvButton } from "@/components/crm/export-csv-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmListPage } from "@/hooks/use-crm-list-page";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DEFAULT_PAGE_SIZE } from "@shared/agro/list-types";
import { useOpportunities } from "@/hooks/use-crm-queries";
import { OPPORTUNITY_STAGES } from "@shared/agro/seed";
import {
  formatBrl,
  formatDate,
  OPPORTUNITY_PRIORITY,
  OPPORTUNITY_STAGE,
  VALUE_FILTER_RANGES,
} from "@/lib/crm-labels";
import { FILTER_ALL, hasActiveFilters } from "@/lib/crm-filter-helpers";
import { ROUTES } from "@/lib/routes";
import type { OpportunityStage } from "@shared/agro/types";

export default function CrmOpportunitiesPage() {
  usePageTitle("Oportunidades");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState(FILTER_ALL);
  const [practiceFilter, setPracticeFilter] = useState(FILTER_ALL);
  const [ownerFilter, setOwnerFilter] = useState(FILTER_ALL);
  const [priorityFilter, setPriorityFilter] = useState(FILTER_ALL);
  const [valueFilter, setValueFilter] = useState(FILTER_ALL);

  const debouncedSearch = useDebouncedValue(search);
  const { page, setPage } = useCrmListPage(
    debouncedSearch,
    stageFilter,
    practiceFilter,
    ownerFilter,
    priorityFilter,
    valueFilter,
  );

  const listParams = useMemo(
    () => ({
      facets: true,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      stage: stageFilter !== FILTER_ALL ? stageFilter : undefined,
      practice: practiceFilter !== FILTER_ALL ? practiceFilter : undefined,
      owner: ownerFilter !== FILTER_ALL ? ownerFilter : undefined,
      priority: priorityFilter !== FILTER_ALL ? priorityFilter : undefined,
      valueRange: valueFilter !== FILTER_ALL ? valueFilter : undefined,
    }),
    [
      page,
      debouncedSearch,
      stageFilter,
      practiceFilter,
      ownerFilter,
      priorityFilter,
      valueFilter,
    ],
  );

  const { data, isLoading } = useOpportunities(listParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets;

  const isFiltered = hasActiveFilters(
    { stageFilter, practiceFilter, ownerFilter, priorityFilter, valueFilter },
    search,
  );

  const stages = OPPORTUNITY_STAGES.filter(
    (s) => s.id !== "perdido" && s.id !== "arquivado",
  );
  const totalValue = items
    .filter((o) => o.stage !== "perdido")
    .reduce((s, o) => s + o.valueBrl, 0);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Oportunidades Agro</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pipeline comercial — propostas e negociações distintas das demandas
              jurídicas em andamento.
            </p>
            <p className="text-xs text-muted-foreground mt-2 tabular-nums">
              {items.length} de {total} oportunidades · Valor filtrado:{" "}
              {formatBrl(totalValue)}
            </p>
          </div>
          <div className="flex gap-2">
            <ExportCsvButton resource="opportunities" />
            <CreateOpportunityForm />
          </div>
        </header>
        <CrmFilters
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar oportunidade, conta ou área..."
          filteredCount={items.length}
          totalCount={total}
        >
          <FilterSelect
            value={stageFilter}
            onChange={setStageFilter}
            label="Filtrar por fase"
            options={[
              { value: FILTER_ALL, label: "Todas as fases" },
              ...(Object.entries(OPPORTUNITY_STAGE) as [OpportunityStage, string][])
                .filter(([value]) => value !== "perdido" && value !== "arquivado")
                .map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            value={practiceFilter}
            onChange={setPracticeFilter}
            label="Filtrar por área de atuação"
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
            value={priorityFilter}
            onChange={setPriorityFilter}
            label="Filtrar por prioridade"
            options={[
              { value: FILTER_ALL, label: "Todas as prioridades" },
              { value: "alta", label: OPPORTUNITY_PRIORITY.alta },
              { value: "normal", label: OPPORTUNITY_PRIORITY.normal },
            ]}
          />
          <FilterSelect
            value={valueFilter}
            onChange={setValueFilter}
            label="Filtrar por valor"
            options={Object.entries(VALUE_FILTER_RANGES).map(([value, range]) => ({
              value,
              label: range.label,
            }))}
          />
        </CrmFilters>

        {isLoading ? (
          <CrmLoadingState />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border rounded-xl">
            {isFiltered
              ? "Nenhuma oportunidade com os filtros atuais."
              : "Nenhuma oportunidade cadastrada."}
          </p>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 min-w-[960px]">
              {stages.map((stage) => {
                const stageItems = items.filter((o) => o.stage === stage.id);
                const stageValue = stageItems.reduce((s, o) => s + o.valueBrl, 0);
                return (
                  <div key={stage.id} className="min-w-[220px]">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {stage.label}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {formatBrl(stageValue)}
                        </span>
                        <Badge variant="muted">{stageItems.length}</Badge>
                      </div>
                    </div>
                    <div className="space-y-3 min-h-[120px]">
                      {stageItems.map((o) => (
                        <Card key={o.id} className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={ROUTES.crm.opportunityDetail(o.id)}
                              className="text-sm font-semibold leading-snug text-primary hover:underline"
                            >
                              {o.title}
                            </Link>
                            {o.priority === "alta" && (
                              <Badge variant="warning" className="shrink-0">
                                {OPPORTUNITY_PRIORITY.alta}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {o.accountName}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {o.practice}
                          </p>
                          <p className="text-sm font-medium text-primary mt-2 tabular-nums">
                            {formatBrl(o.valueBrl)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Fechamento prev.: {formatDate(o.expectedClose)}
                          </p>
                          {o.nextContact && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Próximo contato: {formatDate(o.nextContact)}
                            </p>
                          )}
                        </Card>
                      ))}
                      {stageItems.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-xl">
                          Sem oportunidades nesta fase
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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