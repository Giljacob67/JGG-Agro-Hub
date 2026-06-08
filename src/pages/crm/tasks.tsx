import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { EntityTable } from "@/components/crm/entity-table";
import { Badge } from "@/components/ui/badge";
import { MOCK_TASKS } from "@/lib/crm-mock-data";
import {
  TASK_STATUS,
  TASK_PRIORITY,
  formatDate,
  taskBadgeVariant,
  priorityBadgeVariant,
} from "@/lib/crm-labels";

export default function CrmTasksPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_TASKS.filter((t) => {
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.owner.toLowerCase().includes(q);
      const matchType = typeFilter === "all" || t.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [search, typeFilter]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Tarefas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ações do time — comercial, jurídica e operacional.
          </p>
        </header>
        <CrmFilters search={search} onSearchChange={setSearch} placeholder="Buscar tarefa...">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Filtrar por tipo"
          >
            <option value="all">Todos os tipos</option>
            <option value="comercial">Comercial</option>
            <option value="juridica">Jurídica</option>
            <option value="operacional">Operacional</option>
          </select>
        </CrmFilters>
        <EntityTable
          data={filtered}
          columns={[
            { key: "title", header: "Tarefa", cell: (r) => <span className="font-medium">{r.title}</span> },
            { key: "related", header: "Vínculo", cell: (r) => <span className="font-mono text-xs">{r.relatedTo}</span> },
            { key: "type", header: "Tipo", cell: (r) => <Badge variant="secondary">{r.type}</Badge> },
            { key: "priority", header: "Prioridade", cell: (r) => <Badge variant={priorityBadgeVariant(r.priority)}>{TASK_PRIORITY[r.priority]}</Badge> },
            { key: "status", header: "Status", cell: (r) => <Badge variant={taskBadgeVariant(r.status)}>{TASK_STATUS[r.status]}</Badge> },
            { key: "due", header: "Prazo", cell: (r) => formatDate(r.dueDate) },
            { key: "owner", header: "Responsável", cell: (r) => r.owner },
          ]}
        />
      </div>
    </AppShell>
  );
}