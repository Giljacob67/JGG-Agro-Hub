import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface OperationCriticalPanelProps {
  criticalCount: number;
  overdueTasks: number;
  className?: string;
}

export function OperationCriticalPanel({
  criticalCount,
  overdueTasks,
  className,
}: OperationCriticalPanelProps) {
  const hasAlert = criticalCount > 0 || overdueTasks > 0;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-3",
        hasAlert
          ? "border-accent/35 bg-accent/[0.08]"
          : "border-sidebar-border bg-sidebar-muted/50",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className={cn(
            "w-3.5 h-3.5 shrink-0",
            hasAlert ? "text-accent" : "text-sidebar-foreground/50",
          )}
        />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/70">
          Operação crítica
        </p>
      </div>
      {hasAlert ? (
        <div className="mt-2 space-y-1">
          <p className="text-sm font-semibold text-sidebar-foreground tabular-nums">
            {criticalCount} prazo{criticalCount !== 1 ? "s" : ""} crítico
            {criticalCount !== 1 ? "s" : ""}
          </p>
          {overdueTasks > 0 && (
            <p className="text-[11px] text-sidebar-foreground/70">
              {overdueTasks} tarefa{overdueTasks !== 1 ? "s" : ""} vencida
              {overdueTasks !== 1 ? "s" : ""}
            </p>
          )}
          <Link
            href={ROUTES.crm.tasks}
            className="text-[11px] font-medium text-sidebar-foreground/90 hover:underline inline-block mt-1"
          >
            Revisar agora
          </Link>
        </div>
      ) : (
        <p className="text-[11px] text-sidebar-foreground/60 mt-2 leading-snug">
          Nenhum prazo crítico imediato.
        </p>
      )}
    </div>
  );
}