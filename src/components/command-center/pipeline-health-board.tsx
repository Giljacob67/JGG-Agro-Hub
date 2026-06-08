import { Link } from "wouter";
import type { CrmStats } from "@shared/agro/types";
import { formatBrl } from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface PipelineHealthBoardProps {
  stages: CrmStats["pipelineByStage"];
}

export function PipelineHealthBoard({ stages }: PipelineHealthBoardProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="surface-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
        <div>
          <p className="text-label-caps">Saúde do pipeline</p>
          <h3 className="text-sm font-semibold mt-1">Distribuição por fase comercial</h3>
        </div>
        <Link
          href={ROUTES.crm.opportunities}
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver pipeline
        </Link>
      </div>

      <div className="p-5 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const intensity = stage.count / maxCount;
          return (
            <div key={stage.id} className="surface-inset p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-snug">
                  {stage.label}
                </p>
                <span className="text-sm font-semibold tabular-nums">{stage.count}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                {formatBrl(stage.value)}
              </p>
              <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    intensity > 0.6 ? "bg-primary" : "bg-primary/45",
                  )}
                  style={{ width: `${Math.max(intensity * 100, stage.count > 0 ? 8 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}