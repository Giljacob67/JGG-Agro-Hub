import { useId, useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";

interface TimeEntryManagerProps {
  matterId: string;
}

const TYPE_LABELS: Record<string, string> = {
  horas: "Horas",
  fixo: "Fixo",
  contingencia: "Contingência",
};

export function TimeEntryManager({ matterId }: TimeEntryManagerProps) {
  const qc = useQueryClient();
  const descriptionId = useId();
  const hoursId = useId();
  const hourlyRateId = useId();
  const typeId = useId();
  const dateId = useId();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: "",
    hours: "",
    hourlyRate: "",
    type: "horas",
    date: new Date().toISOString().slice(0, 10),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["time-entries", matterId],
    queryFn: () => agroApi.listTimeEntries({ matterId }),
  });

  const createEntry = useMutation({
    mutationFn: (data: typeof form) =>
      agroApi.createTimeEntry({
        ...data,
        hours: Number(data.hours),
        hourlyRate: Number(data.hourlyRate),
        matterId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-entries", matterId] });
      toast.success("Registro de horas adicionado!");
      setShowForm(false);
      setForm({ description: "", hours: "", hourlyRate: "", type: "horas", date: new Date().toISOString().slice(0, 10) });
    },
    onError: () => toast.error("Erro ao registrar horas"),
  });

  const deleteEntry = useMutation({
    mutationFn: (id: string) => agroApi.deleteTimeEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-entries", matterId] });
      toast.success("Registro removido");
    },
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const totalValue = entries.reduce((sum, e) => sum + (e.totalBrl || 0), 0);
  const unbilledHours = entries.filter((e) => !e.invoiced).reduce((sum, e) => sum + (e.hours || 0), 0);

  const formatBrl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Controle de Horas</h3>
          {entries.length > 0 && (
            <div className="flex gap-2">
              <Badge variant="secondary">{totalHours}h</Badge>
              <Badge variant="secondary">{formatBrl(totalValue)}</Badge>
              {unbilledHours > 0 && (
                <Badge variant="outline" className="text-orange-600">
                  {unbilledHours}h não faturadas
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          {showForm ? "Cancelar" : "Registrar horas"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createEntry.mutate(form);
            }}
            className="grid sm:grid-cols-2 gap-3"
          >
            <div className="sm:col-span-2">
              <label htmlFor={descriptionId} className="text-xs text-muted-foreground">Descrição do serviço</label>
              <Input
                id={descriptionId}
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Análise de contrato de compra de soja"
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor={hoursId} className="text-xs text-muted-foreground">Horas</label>
              <Input
                id={hoursId}
                type="number"
                step="0.5"
                required
                value={form.hours}
                onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                placeholder="2.5"
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor={hourlyRateId} className="text-xs text-muted-foreground">Valor hora (R$)</label>
              <Input
                id={hourlyRateId}
                type="number"
                step="0.01"
                required
                value={form.hourlyRate}
                onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                placeholder="350.00"
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor={typeId} className="text-xs text-muted-foreground">Tipo</label>
              <select
                id={typeId}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={dateId} className="text-xs text-muted-foreground">Data</label>
              <Input
                id={dateId}
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={createEntry.isPending}>
                {createEntry.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Carregando...</p>
      ) : entries.length === 0 ? (
        <div className="border border-dashed border-border/80 rounded-xl p-6 text-center">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum registro de horas</p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/25 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{entry.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString("pt-BR")} · {TYPE_LABELS[entry.type]}
                  {entry.invoiced && " · Faturado"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium tabular-nums">{entry.hours}h</span>
                <span className="text-sm text-muted-foreground tabular-nums">{formatBrl(entry.totalBrl)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteEntry.mutate(entry.id)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
