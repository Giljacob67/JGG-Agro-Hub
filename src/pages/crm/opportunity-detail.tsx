import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { DetailBackLink } from "@/components/crm/detail-back-link";
import { AiAssistPanel } from "@/components/crm/ai-assist-panel";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CrmDetailSkeleton } from "@/components/crm/loading-state";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useOpportunity,
  useRelatedTasks,
  useMattersByOpportunity,
  useUpdateOpportunity,
} from "@/hooks/use-crm-queries";
import {
  OPPORTUNITY_STAGE,
  OPPORTUNITY_PRIORITY,
  MATTER_STATUS,
  RISK_LEVEL,
  formatBrl,
  formatDate,
  riskBadgeVariant,
} from "@/lib/crm-labels";
import type { OpportunityPriority, OpportunityStage } from "@shared/agro/types";
import { ROUTES } from "@/lib/routes";
import { OPPORTUNITY_STAGES } from "@shared/agro/seed";

export default function CrmOpportunityDetailPage() {
  const [, params] = useRoute("/agro/crm/opportunities/:id");
  const id = params?.id ?? "";
  const { data: opp, isLoading, error } = useOpportunity(id);
  const { data: tasks } = useRelatedTasks(id);
  const { data: linkedMatters } = useMattersByOpportunity(id);
  const updateOpp = useUpdateOpportunity();

  usePageTitle(opp ? opp.title : "Oportunidade");

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto p-6">
          <CrmDetailSkeleton />
        </div>
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
            {opp.accountId ? (
              <Link
                href={ROUTES.crm.accountDetail(opp.accountId)}
                className="text-primary hover:underline"
              >
                {opp.accountName}
              </Link>
            ) : (
              opp.accountName
            )}{" "}
            · {opp.practice}
            {opp.leadId && (
              <>
                {" "}
                ·{" "}
                <Link
                  href={ROUTES.crm.leadDetail(opp.leadId)}
                  className="text-primary hover:underline"
                >
                  origem: lead
                </Link>
              </>
            )}
          </p>
        </header>

        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-xl font-semibold text-primary tabular-nums">
              {formatBrl(opp.valueBrl)}
            </p>
            {opp.probability !== undefined && (
              <p className="text-sm text-muted-foreground tabular-nums">
                Valor ponderado:{" "}
                <span className="font-medium text-foreground">
                  {formatBrl(Math.round(opp.valueBrl * (opp.probability / 100)))}
                </span>{" "}
                ({opp.probability}%)
              </p>
            )}
          </div>
          {opp.description && (
            <p className="text-sm text-muted-foreground">{opp.description}</p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Fase</label>
              <select
                value={opp.stage}
                disabled={updateOpp.isPending}
                onChange={(e) =>
                  updateOpp.mutate(
                    { id: opp.id, patch: { stage: e.target.value as OpportunityStage } },
                    { onSuccess: () => toast.success("Fase atualizada!"), onError: () => toast.error("Erro ao atualizar fase") },
                  )
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
                  updateOpp.mutate(
                    { id: opp.id, patch: { priority: e.target.value as OpportunityPriority } },
                    { onSuccess: () => toast.success("Prioridade atualizada!"), onError: () => toast.error("Erro ao atualizar prioridade") },
                  )
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

        {linkedMatters && linkedMatters.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3">Demandas vinculadas</h2>
            <div className="space-y-2">
              {linkedMatters.map((m) => (
                <Link key={m.id} href={ROUTES.crm.matterDetail(m.id)}>
                  <Card className="p-4 flex items-center justify-between gap-3 text-sm hover:bg-muted/25 transition-colors">
                    <span className="font-medium text-primary truncate">
                      {m.title}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline">{MATTER_STATUS[m.status]}</Badge>
                      <Badge variant={riskBadgeVariant(m.risk)}>
                        {RISK_LEVEL[m.risk]}
                      </Badge>
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <ActivityTimeline entityType="opportunity" entityId={opp.id} />

        <AiAssistPanel
          task="next_steps"
          entityType="opportunity"
          entityId={opp.id}
          heading="Próximos passos (IA)"
          autoRun={false}
        />

        <AiAssistPanel
          task="draft_notes"
          entityType="opportunity"
          entityId={opp.id}
          heading="Rascunho de notas (IA)"
          autoRun={false}
        />

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