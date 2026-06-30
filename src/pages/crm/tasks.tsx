import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { FilterSelect } from "@/components/crm/filter-select";
import { CrmTableSkeleton, CrmErrorState } from "@/components/crm/loading-state";
import { CrmPagination } from "@/components/crm/crm-pagination";
import { EntityTable } from "@/components/crm/entity-table";
import { BulkActionsBar } from "@/components/crm/bulk-actions-bar";
import { CreateTaskForm } from "@/components/crm/create-task-form";
import { ExportCsvButton } from "@/components/crm/export-csv-button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmListPage } from "@/hooks/use-crm-list-page";
import { useTableSort } from "@/hooks/use-table-sort";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useBulkApply } from "@/hooks/use-bulk-apply";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTasks, useUpdateTaskStatus } from "@/hooks/use-crm-queries";
import { DEFAULT_PAGE_SIZE } from "@shared/agro/list-types";
import { toast } from "sonner";
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
  const { sort, dir, onSort } = useTableSort();
  const { page, setPage } = useCrmListPage(
    debouncedSearch,
    statusFilter,
    priorityFilter,
    ownerFilter,
    typeFilter,
    dueFilter,
    sort,
    dir,
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
      sort,
      dir,
    }),
    [
      page,
      debouncedSearch,
      statusFilter,
      priorityFilter,
      ownerFilter,
      typeFilter,
      dueFilter,
      sort,
      dir,
    ],
  );

  const { data, isLoading, isError, error } = useTasks(listParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets;

  const selection = useRowSelection(items.map((i) => i.id));
  const bulk = useBulkApply();

  const isFiltered = hasActiveFilters(
    { statusFilter, priorityFilter, ownerFilter, typeFilter, dueFilter },
    search,
  );

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tarefas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ações do time — comercial, jurídica e operacional.
            </p>
          </div>
          <div className="flex gap-2">
            <ExportCsvButton resource="tasks" />
            <CreateTaskForm />
          </div>
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
          <CrmTableSkeleton cols={7} />
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
                  Object.entries(TASK_STATUS) as [TaskStatus, string][]
                ).map(([value, label]) => ({ value, label })),
                onApply: (value) =>
                  bulk.apply(
                    selection.selectedIds,
                    (id) =>
                      updateStatus.mutateAsync({
                        id,
                        status: value as TaskStatus,
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
              isTaskOverdue(r) ? "bg-red-50/60 dark:bg-red-950/20" : undefined
            }
            columns={[
              {
                key: "title",
                header: "Tarefa",
                sortKey: "title",
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
                sortKey: "type",
                cell: (r) => <Badge variant="secondary">{r.type}</Badge>,
              },
              {
                key: "priority",
                header: "Prioridade",
                sortKey: "priority",
                cell: (r) => (
                  <Badge variant={priorityBadgeVariant(r.priority)}>
                    {TASK_PRIORITY[r.priority]}
                  </Badge>
                ),
              },
              {
                key: "status",
                header: "Status",
                sortKey: "status",
                cell: (r) => (
                  <select
                    value={r.status}
                    disabled={updateStatus.isPending}
                    onChange={(e) =>
                      updateStatus.mutate(
                        { id: r.id, status: e.target.value as TaskStatus },
                        { onSuccess: () => toast.success("Tarefa atualizada!"), onError: () => toast.error("Erro ao atualizar tarefa") },
                      )
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
                sortKey: "dueDate",
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
              { key: "owner", header: "Responsável", sortKey: "owner", cell: (r) => r.owner },
            ]}
          />
          </>
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