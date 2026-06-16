import { useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  FileText,
  BarChart3,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAllMatters, useTimeEntries } from "@/hooks/use-crm-queries";
import { formatCurrency } from "@/lib/format-utils";

export default function ReportsPage() {
  usePageTitle("Relatórios Financeiros");

  const { data: matters } = useAllMatters();
  const { data: timeEntries } = useTimeEntries();

  const stats = useMemo(() => {
    const mattersData = matters as any;
    const mattersList = mattersData?.items || mattersData || [];
    const entriesData = timeEntries as any;
    const entries = entriesData?.items || entriesData || [];

    const totalRevenue = entries
      .filter((e: any) => e.billed)
      .reduce((sum: number, e: any) => sum + (e.totalValue || e.hours * e.hourlyRate || 0), 0);

    const unbilledRevenue = entries
      .filter((e: any) => !e.billed)
      .reduce((sum: number, e: any) => sum + (e.totalValue || e.hours * e.hourlyRate || 0), 0);

    const totalHours = entries.reduce((sum: number, e: any) => sum + (e.hours || 0), 0);
    const unbilledHours = entries
      .filter((e: any) => !e.billed)
      .reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

    const mattersByStatus: Record<string, number> = {};
    mattersList.forEach((m: any) => {
      const status = m.status || "Sem status";
      mattersByStatus[status] = (mattersByStatus[status] || 0) + 1;
    });

    const mattersByType: Record<string, number> = {};
    mattersList.forEach((m: any) => {
      const type = m.type || "Sem tipo";
      mattersByType[type] = (mattersByType[type] || 0) + 1;
    });

    const entriesByMatter: Record<string, number> = {};
    entries.forEach((e: any) => {
      const mid = e.matterId || "Sem demanda";
      entriesByMatter[mid] = (entriesByMatter[mid] || 0) + (e.hours || 0);
    });

    return {
      totalMatters: mattersList.length,
      activeMatters: mattersList.filter((m: any) => m.status !== "encerrado" && m.status !== "arquivado").length,
      totalRevenue,
      unbilledRevenue,
      totalHours,
      unbilledHours,
      mattersByStatus,
      mattersByType,
      entriesByMatter,
      averageHoursPerMatter: mattersList.length > 0 ? totalHours / mattersList.length : 0,
    };
  }, [matters, timeEntries]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Relatórios Financeiros</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Receita faturada</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">A faturar</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(stats.unbilledRevenue)}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Horas totais</span>
            </div>
            <p className="text-lg font-bold">{stats.totalHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">{stats.unbilledHours.toFixed(1)}h não faturadas</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Demandas</span>
            </div>
            <p className="text-lg font-bold">{stats.totalMatters}</p>
            <p className="text-xs text-muted-foreground">{stats.activeMatters} ativas</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Demandas por status</h3>
            <div className="space-y-2">
              {Object.entries(stats.mattersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm">{status}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-primary/20 rounded-full"
                      style={{
                        width: `${Math.max(20, (count / stats.totalMatters) * 100)}px`,
                      }}
                    >
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(count / stats.totalMatters) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Demandas por tipo</h3>
            <div className="space-y-2">
              {Object.entries(stats.mattersByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm">{type}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-blue-500/20 rounded-full"
                      style={{
                        width: `${Math.max(20, (count / stats.totalMatters) * 100)}px`,
                      }}
                    >
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(count / stats.totalMatters) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Horas por demanda</h3>
          {Object.keys(stats.entriesByMatter).length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma entrada de horas registrada</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.entriesByMatter)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([matterId, hours]) => (
                  <div key={matterId} className="flex items-center justify-between">
                    <span className="text-sm truncate max-w-xs">{matterId}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 bg-amber-500/20 rounded-full"
                        style={{
                          width: `${Math.max(20, (hours / stats.totalHours) * 200)}px`,
                        }}
                      >
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{
                            width: `${(hours / stats.totalHours) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-mono w-12 text-right">{hours.toFixed(1)}h</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Resumo financeiro</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Média de horas/demanda</p>
              <p className="text-lg font-semibold">{stats.averageHoursPerMatter.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ticket médio por demanda</p>
              <p className="text-lg font-semibold">
                {stats.totalMatters > 0
                  ? formatCurrency(stats.totalRevenue / stats.totalMatters)
                  : formatCurrency(0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Taxa de faturamento</p>
              <p className="text-lg font-semibold">
                {stats.totalHours > 0
                  ? `${((1 - stats.unbilledHours / stats.totalHours) * 100).toFixed(0)}%`
                  : "0%"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Demandas ativas</p>
              <p className="text-lg font-semibold">{stats.activeMatters}</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
