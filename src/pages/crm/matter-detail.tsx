import { useRoute } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { DetailBackLink } from "@/components/crm/detail-back-link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useMatter,
  useRelatedTasks,
  useUpdateMatter,
} from "@/hooks/use-crm-queries";
import {
  MATTER_STATUS,
  MATTER_URGENCY,
  RISK_LEVEL,
  formatDate,
  isCriticalDeadline,
  riskBadgeVariant,
} from "@/lib/crm-labels";
import type { MatterStatus, RiskLevel } from "@shared/agro/types";
import { ROUTES } from "@/lib/routes";

export default function CrmMatterDetailPage() {
  const [, params] = useRoute("/agro/crm/matters/:id");
  const id = params?.id ?? "";
  const { data: matter, isLoading, error } = useMatter(id);
  const { data: tasks } = useRelatedTasks(id);
  const updateMatter = useUpdateMatter();

  usePageTitle(matter ? matter.title : "Demanda");

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground p-6">Carregando…</p>
      </AppShell>
    );
  }

  if (error || !matter) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground p-6">Demanda não encontrada.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <DetailBackLink href={ROUTES.crm.matters} label="Demandas jurídicas" />

        <header>
          <p className="text-xs font-mono text-muted-foreground">{matter.id}</p>
          <h1 className="text-2xl font-bold mt-1">{matter.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {matter.accountName} · {matter.practice}
          </p>
        </header>

        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                value={matter.status}
                disabled={updateMatter.isPending}
                onChange={(e) =>
                  updateMatter.mutate({
                    id: matter.id,
                    patch: { status: e.target.value as MatterStatus },
                  })
                }
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {Object.entries(MATTER_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Risco</label>
              <select
                value={matter.risk}
                disabled={updateMatter.isPending}
                onChange={(e) =>
                  updateMatter.mutate({
                    id: matter.id,
                    patch: { risk: e.target.value as RiskLevel },
                  })
                }
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {Object.entries(RISK_LEVEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Responsável</p>
              <p className="font-medium">{matter.owner}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prazo</p>
              <span
                className={
                  isCriticalDeadline(matter.deadline, matter.risk, matter.status)
                    ? "text-red-700 dark:text-red-400 font-medium"
                    : ""
                }
              >
                {formatDate(matter.deadline)}
              </span>
            </div>
            {matter.urgency && (
              <div>
                <p className="text-xs text-muted-foreground">Urgência</p>
                <Badge variant={riskBadgeVariant(matter.risk)}>
                  {MATTER_URGENCY[matter.urgency]}
                </Badge>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Descrição</p>
            <p className="text-sm leading-relaxed">{matter.description}</p>
          </div>

          {matter.nextSteps && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Próximos passos</p>
              <p className="text-sm leading-relaxed">{matter.nextSteps}</p>
            </div>
          )}

          {matter.pendingDocuments && matter.pendingDocuments.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Documentos pendentes</p>
              <ul className="space-y-1 text-sm">
                {matter.pendingDocuments.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </div>
          )}
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