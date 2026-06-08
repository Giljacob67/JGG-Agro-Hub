import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { FilterSelect } from "@/components/crm/filter-select";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { CrmPagination } from "@/components/crm/crm-pagination";
import { EntityTable } from "@/components/crm/entity-table";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmListPage } from "@/hooks/use-crm-list-page";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTasks, useUpdateTaskStatus } from "@/hooks/use-crm-queries";
import { DEFAULT_PAGE_SIZE } from "@shared/agro/list-types";
import {
  TASK_STATUS,
  TASK_PRIORITY,
  formatDate,
  isTaskOverdue,
  isWithinDays,
  priorityBadgeVariant,
} from "@/lib/crm-labels";
import { FILTER_ALL, hasActiveFilters } from "@/lib/crm-filter-helpers";
import type { TaskPriority, TaskStatus } from "@shared/agro/types";

export default function CrmTasksPage() {
  usePageTitle("Tarefas");
  const updateStatus = useUpdateTaskStatus();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [priorityFilter, setPriorityFilter] = useState(FILTER_ALL);
  const [ownerFilter, setOwnerFilter] = useState(FILTER_ALL);
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  const [dueFilter, setDueFilter] = useState(FILTER_ALL);

  const debouncedSearch = useDebouncedValue(search);
  const { page, setPage } = useCrmListPage(
    debouncedSearch,
    statusFilter,
    priorityFilter,
    ownerFilter,
    typeFilter,
    dueFilter,
  );

  const listParams = useMemo(
    () => ({
      facets: true,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      status: statusFilter !== FILTER_ALL ? statusFilter : undefined,
      priority: priorityFilter !== FILTER_ALL ? priorityFilter : undefined,
      owner: ownerFilter !== FILTER_ALL ? ownerFilter : undefined,
      type: typeFilter !== FILTER_ALL ? typeFilter : undefined,
      due: dueFilter !== FILTER_ALL ? dueFilter : undefined,
    }),
    [
      page,
      debouncedSearch,
      statusFilter,
      priorityFilter,
      ownerFilter,
      typeFilter,
      dueFilter,
    ],
  );

  const { data, isLoading } = useTasks(listParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets;

  const isFiltered = hasActiveFilters(
    { statusFilter, priorityFilter, ownerFilter, typeFilter, dueFilter },
    search,
  );

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Tarefas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ações do time — comercial, jurídica e operacional.
          </p>
        </header>
        <CrmFilters
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar tarefa..."
          filteredCount={items.length}
          totalCount={total}
        >
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            label="Filtrar por status"
            options={[
              { value: FILTER_ALL, label: "Todos os status" },
              ...(Object.entries(TASK_STATUS) as [TaskStatus, string][]).map(
                ([value, label]) => ({ value, label }),
              ),
            ]}
          />
          <FilterSelect
            value={priorityFilter}
            onChange={setPriorityFilter}
            label="Filtrar por prioridade"
            options={[
              { value: FILTER_ALL, label: "Todas as prioridades" },
              ...(Object.entries(TASK_PRIORITY) as [TaskPriority, string][]).map(
                ([value, label]) => ({ value, label }),
              ),
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
            value={typeFilter}
            onChange={setTypeFilter}
            label="Filtrar por tipo"
            options={[
              { value: FILTER_ALL, label: "Todos os tipos" },
              { value: "comercial", label: "Comercial" },
              { value: "juridica", label: "Jurídica" },
              { value: "operacional", label: "Operacional" },
            ]}
          />
          <FilterSelect
            value={dueFilter}
            onChange={setDueFilter}
            label="Filtrar por prazo"
            options={[
              { value: FILTER_ALL, label: "Todos os prazos" },
              { value: "vencidas", label: "Vencidas" },
              { value: "proximas", label: "Próximas (7 dias)" },
            ]}
          />
        </CrmFilters>
        {isLoading ? (
          <CrmLoadingState />
        ) : (
          <EntityTable
            data={items}
            isFiltered={isFiltered}
            getRowClassName={(r) =>
              isTaskOverdue(r) ? "bg-red-50/60 dark:bg-red-950/20" : undefined
            }
            columns={[
              {
                key: "title",
                header: "Tarefa",
                cell: (r) => <span className="font-medium">{r.title}</span>,
              },
              {
                key: "related",
                header: "Vínculo",
                cell: (r) => (
                  <span className="font-mono text-xs">{r.relatedTo}</span>
                ),
              },
              {
                key: "type",
                header: "Tipo",
                cell: (r) => <Badge variant="secondary">{r.type}</Badge>,
              },
              {
                key: "priority",
                header: "Prioridade",
                cell: (r) => (
                  <Badge variant={priorityBadgeVariant(r.priority)}>
                    {TASK_PRIORITY[r.priority]}
                  </Badge>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (r) => (
                  <select
                    value={r.status}
                    disabled={updateStatus.isPending}
                    onChange={(e) =>
                      updateStatus.mutate({
                        id: r.id,
                        status: e.target.value as TaskStatus,
                      })
                    }
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    aria-label={`Status da tarefa ${r.title}`}
                  >
                    {Object.entries(TASK_STATUS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                key: "due",
                header: "Prazo",
                cell: (r) => (
                  <span
                    className={
                      isTaskOverdue(r)
                        ? "text-red-700 dark:text-red-400 font-medium"
                        : isWithinDays(r.dueDate, 3) && r.status !== "concluida"
                          ? "font-medium"
                          : ""
                    }
                  >
                    {formatDate(r.dueDate)}
                  </span>
                ),
              },
              { key: "owner", header: "Responsável", cell: (r) => r.owner },
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