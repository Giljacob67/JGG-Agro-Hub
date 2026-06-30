import { Link } from "wouter";
import type { CrmStats } from "@shared/agro/types";
import { formatBrl } from "@/lib/crm-labels";
import { ROUTES } from "@/lib/routes";
import { PipelineFunnelChart } from "./charts/pipeline-funnel-chart";

interface PipelineHealthBoardProps {
  stages: CrmStats["pipelineByStage"];
}

export function PipelineHealthBoard({ stages }: PipelineHealthBoardProps) {
  const totalValue = stages.reduce((sum, s) => sum + s.value, 0);
  const totalCount = stages.reduce((sum, s) => sum + s.count, 0);

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

      <div className="px-5 pt-4 pb-1 flex flex-wrap gap-x-6 gap-y-1">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Valor em pipeline
          </p>
          <p className="text-lg font-bold tabular-nums">{formatBrl(totalValue)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Oportunidades
          </p>
          <p className="text-lg font-bold tabular-nums">{totalCount}</p>
        </div>
      </div>

      <div className="p-5 pt-2">
        <PipelineFunnelChart stages={stages} />
      </div>
    </div>
  );
}