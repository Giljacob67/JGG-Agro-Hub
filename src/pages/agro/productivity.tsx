import { useMemo } from "react";
import { Users, Clock, FileText, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAllMatters, useTimeEntries } from "@/hooks/use-crm-queries";
import { formatCurrency, formatHours } from "@/lib/crm-labels";

export default function ProductivityPage() {
  usePageTitle("Produtividade por Advogado");

  const { data: matters } = useAllMatters();
  const { data: timeEntries } = useTimeEntries();

  const productivity = useMemo(() => {
    const mattersList = matters?.items ?? [];
    const entries = timeEntries ?? [];

    const byLawyer: Record<
      string,
      {
        hours: number;
        billedHours: number;
        unbilledHours: number;
        revenue: number;
        mattersCount: number;
        activeMatters: number;
      }
    > = {};

    entries.forEach((e) => {
      const lawyer = e.owner || "Não informado";
      if (!byLawyer[lawyer]) {
        byLawyer[lawyer] = {
          hours: 0,
          billedHours: 0,
          unbilledHours: 0,
          revenue: 0,
          mattersCount: 0,
          activeMatters: 0,
        };
      }
      byLawyer[lawyer].hours += e.hours || 0;
      if (e.invoiced) {
        byLawyer[lawyer].billedHours += e.hours || 0;
        byLawyer[lawyer].revenue += e.totalBrl || e.hours * e.hourlyRate || 0;
      } else {
        byLawyer[lawyer].unbilledHours += e.hours || 0;
      }
    });

    const mattersByOwner: Record<string, { total: number; active: number }> = {};
    mattersList.forEach((m) => {
      const owner = m.owner || "Não informado";
      if (!mattersByOwner[owner]) mattersByOwner[owner] = { total: 0, active: 0 };
      mattersByOwner[owner].total++;
      if (m.status !== "concluida") {
        mattersByOwner[owner].active++;
      }
    });

    Object.keys(byLawyer).forEach((lawyer) => {
      const m = mattersByOwner[lawyer] || { total: 0, active: 0 };
      byLawyer[lawyer].mattersCount = m.total;
      byLawyer[lawyer].activeMatters = m.active;
    });

    return Object.entries(byLawyer)
      .sort(([, a], [, b]) => b.hours - a.hours)
      .map(([lawyer, stats]) => ({
        lawyer,
        ...stats,
        avgHoursPerMatter: stats.mattersCount > 0 ? stats.hours / stats.mattersCount : 0,
      }));
  }, [matters, timeEntries]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Produtividade por Advogado</h1>
        </div>

        {productivity.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nenhuma entrada de horas registrada ainda.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {productivity.map((p) => (
              <Card key={p.lawyer} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {p.lawyer
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.lawyer}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.mattersCount} demandas ({p.activeMatters} ativas)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>{formatHours(p.hours)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>{formatHours(p.billedHours)} faturadas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                      <span>{formatCurrency(p.revenue)}</span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {formatHours(p.avgHoursPerMatter)}/demanda
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
