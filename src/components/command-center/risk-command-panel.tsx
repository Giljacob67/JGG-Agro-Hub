import { Link } from "wouter";
import type { CrmStats } from "@shared/agro/types";
import { Badge } from "@/components/ui/badge";
import { formatDate, RISK_LEVEL, riskBadgeVariant } from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";

interface RiskCommandPanelProps {
  stats: CrmStats;
}

export function RiskCommandPanel({ stats }: RiskCommandPanelProps) {
  const items = [
    ...stats.riskAlerts.map((m) => ({ kind: "matter" as const, matter: m })),
    ...stats.overdueTasksList.slice(0, 2).map((t) => ({ kind: "task" as const, task: t })),
  ].slice(0, 5);

  return (
    <section className="surface-panel overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-border/70">
        <p className="text-label-caps">Comando de risco</p>
        <h3 className="text-sm font-semibold mt-1">Alertas que exigem decisão</h3>
      </div>

      <div className="p-4 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-6 text-center">
            Nenhum alerta crítico no momento.
          </p>
        ) : (
          items.map((item) =>
            item.kind === "matter" ? (
              <div key={item.matter.id} className="surface-inset px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={ROUTES.crm.matterDetail(item.matter.id)}
                      className="text-sm font-medium hover:text-primary line-clamp-2"
                    >
                      {item.matter.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {item.matter.accountName} · prazo {formatDate(item.matter.deadline)}
                    </p>
                  </div>
                  <Badge variant={riskBadgeVariant(item.matter.risk)} className="shrink-0">
                    {RISK_LEVEL[item.matter.risk]}
                  </Badge>
                </div>
              </div>
            ) : (
              <div key={item.task.id} className="surface-inset px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={ROUTES.crm.tasks}
                      className="text-sm font-medium hover:text-primary line-clamp-2"
                    >
                      {item.task.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {item.task.owner} · {formatDate(item.task.dueDate)}
                    </p>
                  </div>
                  <Badge variant="danger" className="shrink-0">
                    Vencida
                  </Badge>
                </div>
              </div>
            ),
          )
        )}
      </div>
    </section>
  );
}