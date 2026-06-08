import { useRoute } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { DetailBackLink } from "@/components/crm/detail-back-link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useOpportunity,
  useRelatedTasks,
  useUpdateOpportunity,
} from "@/hooks/use-crm-queries";
import {
  OPPORTUNITY_STAGE,
  OPPORTUNITY_PRIORITY,
  formatBrl,
  formatDate,
} from "@/lib/crm-labels";
import type { OpportunityPriority, OpportunityStage } from "@shared/agro/types";
import { ROUTES } from "@/lib/routes";
import { OPPORTUNITY_STAGES } from "@shared/agro/seed";

export default function CrmOpportunityDetailPage() {
  const [, params] = useRoute("/agro/crm/opportunities/:id");
  const id = params?.id ?? "";
  const { data: opp, isLoading, error } = useOpportunity(id);
  const { data: tasks } = useRelatedTasks(id);
  const updateOpp = useUpdateOpportunity();

  usePageTitle(opp ? opp.title : "Oportunidade");

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground p-6">Carregando…</p>
      </AppShell>
    );
  }

  if (error || !opp) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground p-6">Oportunidade não encontrada.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <DetailBackLink href={ROUTES.crm.opportunities} label="Oportunidades" />

        <header>
          <p className="text-xs font-mono text-muted-foreground">{opp.id}</p>
          <h1 className="text-2xl font-bold mt-1">{opp.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {opp.accountName} · {opp.practice}
          </p>
        </header>

        <Card className="p-5 space-y-4">
          <p className="text-xl font-semibold text-primary tabular-nums">
            {formatBrl(opp.valueBrl)}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Fase</label>
              <select
                value={opp.stage}
                disabled={updateOpp.isPending}
                onChange={(e) =>
                  updateOpp.mutate({
                    id: opp.id,
                    patch: { stage: e.target.value as OpportunityStage },
                  })
                }
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {OPPORTUNITY_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Prioridade</label>
              <select
                value={opp.priority}
                disabled={updateOpp.isPending}
                onChange={(e) =>
                  updateOpp.mutate({
                    id: opp.id,
                    patch: { priority: e.target.value as OpportunityPriority },
                  })
                }
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="normal">{OPPORTUNITY_PRIORITY.normal}</option>
                <option value="alta">{OPPORTUNITY_PRIORITY.alta}</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Responsável</p>
              <p className="font-medium">{opp.owner}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fechamento previsto</p>
              <p>{formatDate(opp.expectedClose)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Próximo contato</p>
              <p>{opp.nextContact ? formatDate(opp.nextContact) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fase atual</p>
              <Badge variant="outline">{OPPORTUNITY_STAGE[opp.stage]}</Badge>
            </div>
            {opp.probability !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Probabilidade</p>
                <p>{opp.probability}%</p>
              </div>
            )}
            {opp.nextStep && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Próximo passo</p>
                <p>{opp.nextStep}</p>
              </div>
            )}
          </div>
        </Card>

        {tasks && tasks.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3">Tarefas vinculadas</h2>
            <div className="space-y-2">
              {tasks.map((t) => (
                <Card key={t.id} className="p-4 text-sm">
                  {t.title} · {formatDate(t.dueDate)}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}