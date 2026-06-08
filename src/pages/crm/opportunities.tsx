import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useOpportunities } from "@/hooks/use-crm-queries";
import { OPPORTUNITY_STAGES } from "@/lib/crm-mock-data";
import {
  formatBrl,
  formatDate,
  OPPORTUNITY_PRIORITY,
} from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";

export default function CrmOpportunitiesPage() {
  usePageTitle("Oportunidades");
  const { data: opportunities = [], isLoading } = useOpportunities();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return opportunities.filter((o) => {
      const matchSearch =
        !q ||
        o.title.toLowerCase().includes(q) ||
        o.accountName.toLowerCase().includes(q) ||
        o.practice.toLowerCase().includes(q);
      const matchPriority =
        priorityFilter === "all" || o.priority === priorityFilter;
      return matchSearch && matchPriority;
    });
  }, [opportunities, search, priorityFilter]);

  const stages = OPPORTUNITY_STAGES.filter((s) => s.id !== "perdido");
  const totalValue = filtered
    .filter((o) => o.stage !== "perdido")
    .reduce((s, o) => s + o.valueBrl, 0);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Oportunidades Agro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pipeline comercial — propostas e negociações distintas das demandas
            jurídicas em andamento.
          </p>
          <p className="text-xs text-muted-foreground mt-2 tabular-nums">
            Valor total filtrado: {formatBrl(totalValue)}
          </p>
        </header>
        <CrmFilters
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar oportunidade, conta ou área..."
        >
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Filtrar por prioridade"
          >
            <option value="all">Todas as prioridades</option>
            <option value="alta">Alta</option>
            <option value="normal">Normal</option>
          </select>
        </CrmFilters>

        {isLoading ? (
          <CrmLoadingState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {stages.map((stage) => {
              const items = filtered.filter((o) => o.stage === stage.id);
              const stageValue = items.reduce((s, o) => s + o.valueBrl, 0);
              return (
                <div key={stage.id} className="min-w-0">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {stage.label}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatBrl(stageValue)}
                      </span>
                      <Badge variant="muted">{items.length}</Badge>
                    </div>
                  </div>
                  <div className="space-y-3 min-h-[120px]">
                    {items.map((o) => (
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
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-xl">
                        Sem oportunidades nesta fase
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}