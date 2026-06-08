import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CrmFilters } from "@/components/crm/crm-filters";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_OPPORTUNITIES, OPPORTUNITY_STAGES } from "@/lib/crm-mock-data";
import { formatBrl, formatDate } from "@/lib/crm-labels";

export default function CrmOpportunitiesPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_OPPORTUNITIES.filter(
      (o) =>
        !q ||
        o.title.toLowerCase().includes(q) ||
        o.accountName.toLowerCase().includes(q),
    );
  }, [search]);

  const stages = OPPORTUNITY_STAGES.filter((s) => s.id !== "perdido");

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Oportunidades</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pipeline comercial — separado das demandas jurídicas em andamento.
          </p>
        </header>
        <CrmFilters search={search} onSearchChange={setSearch} placeholder="Buscar oportunidade..." />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stages.map((stage) => {
            const items = filtered.filter((o) => o.stage === stage.id);
            return (
              <div key={stage.id} className="min-w-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {stage.label}
                  </h2>
                  <Badge variant="muted">{items.length}</Badge>
                </div>
                <div className="space-y-3 min-h-[120px]">
                  {items.map((o) => (
                    <Card key={o.id} className="p-4">
                      <p className="text-sm font-semibold leading-snug">{o.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{o.accountName}</p>
                      <p className="text-sm font-medium text-primary mt-2">{formatBrl(o.valueBrl)}</p>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Fechamento prev.: {formatDate(o.expectedClose)}
                      </p>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-xl">
                      Vazio
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}