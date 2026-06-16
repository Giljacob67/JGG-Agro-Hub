import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { FilterSelect } from "@/components/crm/filter-select";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { CrmPagination } from "@/components/crm/crm-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmListPage } from "@/hooks/use-crm-list-page";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuditLogs, useAuditStats } from "@/hooks/use-crm-queries";
import { DEFAULT_PAGE_SIZE } from "@shared/agro/list-types";
import { FILTER_ALL } from "@/lib/crm-filter-helpers";
import {
  Shield,
  FileText,
  User,
  Calendar,
  Download,
  RefreshCw,
} from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  convert: "Conversão",
  export: "Exportação",
};

const ENTITY_LABELS: Record<string, string> = {
  lead: "Lead",
  account: "Conta",
  opportunity: "Oportunidade",
  matter: "Demanda",
  task: "Tarefa",
  deadline: "Prazo",
  activity: "Atividade",
  knowledge: "Base de Conhecimento",
  user: "Usuário",
};

function actionBadgeVariant(action: string) {
  switch (action) {
    case "create":
      return "success" as const;
    case "update":
      return "secondary" as const;
    case "delete":
      return "danger" as const;
    case "convert":
      return "default" as const;
    default:
      return "outline" as const;
  }
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogsPage() {
  usePageTitle("Auditoria");
  const { data: stats } = useAuditStats();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState(FILTER_ALL);
  const [actionFilter, setActionFilter] = useState(FILTER_ALL);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const debouncedSearch = useDebouncedValue(search);
  const { page, setPage } = useCrmListPage(
    debouncedSearch,
    entityFilter,
    actionFilter,
    fromDate,
    toDate,
  );

  const listParams = useMemo(
    () => ({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      entityType: entityFilter !== FILTER_ALL ? entityFilter : undefined,
      action: actionFilter !== FILTER_ALL ? actionFilter : undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      limit: DEFAULT_PAGE_SIZE,
      offset: (page - 1) * DEFAULT_PAGE_SIZE,
    }),
    [page, entityFilter, actionFilter, fromDate, toDate],
  );

  const { data, isLoading, refetch } = useAuditLogs(listParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (entityFilter !== FILTER_ALL) params.set("entityType", entityFilter);
    if (actionFilter !== FILTER_ALL) params.set("action", actionFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    window.open(`/api/agro/audit?action=export&${params.toString()}`, "_blank");
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="size-6" />
              Auditoria
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Histórico completo de alterações no sistema para compliance e rastreabilidade.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-4 mr-1" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="size-4 mr-1" />
              Exportar CSV
            </Button>
          </div>
        </header>

        {stats && (
          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Registros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLogs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Por Entidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(stats.byEntity).map(([entity, count]) => (
                    <Badge key={entity} variant="secondary" className="text-xs">
                      {ENTITY_LABELS[entity] ?? entity}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Por Ação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(stats.byAction).map(([action, count]) => (
                    <Badge key={action} variant={actionBadgeVariant(action)} className="text-xs">
                      {ACTION_LABELS[action] ?? action}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <CrmFilters
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar por ID ou usuário..."
          filteredCount={items.length}
          totalCount={total}
        >
          <FilterSelect
            value={entityFilter}
            onChange={setEntityFilter}
            label="Filtrar por entidade"
            options={[
              { value: FILTER_ALL, label: "Todas as entidades" },
              ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <FilterSelect
            value={actionFilter}
            onChange={setActionFilter}
            label="Filtrar por ação"
            options={[
              { value: FILTER_ALL, label: "Todas as ações" },
              ...Object.entries(ACTION_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">De:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Até:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            />
          </div>
        </CrmFilters>

        {isLoading ? (
          <CrmLoadingState label="Carregando logs de auditoria..." />
        ) : items.length === 0 ? (
          <Card className="surface-panel">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <FileText className="size-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum registro de auditoria encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((log) => (
              <Card key={log.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={actionBadgeVariant(log.action)}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                        <Badge variant="outline">
                          {ENTITY_LABELS[log.entityType] ?? log.entityType}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {log.entityId}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {log.userName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatTimestamp(log.timestamp)}
                        </span>
                        {log.ip && <span className="font-mono">{log.ip}</span>}
                      </div>
                      {log.before && log.after && (
                        <div className="mt-2 text-xs">
                          <DiffView before={log.before} after={log.after} />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && (
          <CrmPagination
            page={page}
            pageSize={DEFAULT_PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>
    </AppShell>
  );
}

function DiffView({
  before,
  after,
}: {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}) {
  const changes = useMemo(() => {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const result: Array<{ field: string; oldVal: string; newVal: string }> = [];
    for (const key of allKeys) {
      const oldVal = String(before[key] ?? "");
      const newVal = String(after[key] ?? "");
      if (oldVal !== newVal) {
        result.push({ field: key, oldVal, newVal });
      }
    }
    return result;
  }, [before, after]);

  if (changes.length === 0) return null;

  return (
    <div className="surface-inset rounded-md p-2 mt-1">
      <span className="text-xs font-medium text-muted-foreground">Alterações:</span>
      <div className="mt-1 space-y-0.5">
        {changes.slice(0, 5).map(({ field, oldVal, newVal }) => (
          <div key={field} className="flex items-center gap-2 text-xs">
            <span className="font-medium text-muted-foreground min-w-[80px]">{field}:</span>
            <span className="text-red-600 dark:text-red-400 line-through truncate max-w-[120px]">
              {oldVal || "(vazio)"}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="text-green-600 dark:text-green-400 truncate max-w-[120px]">
              {newVal || "(vazio)"}
            </span>
          </div>
        ))}
        {changes.length > 5 && (
          <span className="text-xs text-muted-foreground">
            +{changes.length - 5} mais alterações
          </span>
        )}
      </div>
    </div>
  );
}
