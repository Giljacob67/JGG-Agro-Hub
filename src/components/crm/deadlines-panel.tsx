import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import {
  useCreateDeadline,
  useDeadlines,
  useUpdateDeadline,
} from "@/hooks/use-crm-queries";
import { DEADLINE_STATUS, DEADLINE_TYPE, formatDate } from "@/lib/crm-labels";
import { todayIso } from "@/lib/utils";
import type { Deadline, DeadlineType } from "@/lib/crm-types";

function isOverdue(d: Deadline) {
  return d.status === "pendente" && d.dueDate < todayIso();
}

interface DeadlinesPanelProps {
  matterId: string;
}

export function DeadlinesPanel({ matterId }: DeadlinesPanelProps) {
  const { user } = useAuth();
  const { data: deadlines, isLoading } = useDeadlines(matterId);
  const createDeadline = useCreateDeadline();
  const updateDeadline = useUpdateDeadline(matterId);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DeadlineType>("fatal");
  const [dueDate, setDueDate] = useState("");

  function submit() {
    if (!title.trim() || !dueDate) return;
    createDeadline.mutate(
      {
        matterId,
        title: title.trim(),
        type,
        dueDate,
        owner: user?.name ?? "Equipe Jurídica Agro",
      },
      {
        onSuccess: () => {
          setTitle("");
          setDueDate("");
          setShowForm(false);
        },
      },
    );
  }

  const sorted = [...(deadlines ?? [])].sort((a, b) => {
    const pendingFirst =
      Number(a.status !== "pendente") - Number(b.status !== "pendente");
    if (pendingFirst !== 0) return pendingFirst;
    return a.dueDate < b.dueDate ? -1 : 1;
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Prazos processuais</h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "Novo prazo"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 mb-3 space-y-3">
          <div>
            <label htmlFor="deadline-title" className="text-xs text-muted-foreground">
              Descrição do prazo
            </label>
            <input
              id="deadline-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Contestação — art. 335 CPC"
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="deadline-type" className="text-xs text-muted-foreground">
                Natureza
              </label>
              <select
                id="deadline-type"
                value={type}
                onChange={(e) => setType(e.target.value as DeadlineType)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {Object.entries(DEADLINE_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="deadline-due" className="text-xs text-muted-foreground">
                Vencimento
              </label>
              <input
                id="deadline-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={submit}
              disabled={!title.trim() || !dueDate || createDeadline.isPending}
            >
              {createDeadline.isPending ? "Salvando…" : "Salvar prazo"}
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando prazos…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum prazo cadastrado para esta demanda.
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((d) => {
            const overdue = isOverdue(d);
            return (
              <Card
                key={d.id}
                className={`p-4 flex items-center justify-between gap-3 ${
                  d.status !== "pendente" ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    {d.title}
                    <Badge variant={d.type === "fatal" ? "danger" : "secondary"}>
                      {DEADLINE_TYPE[d.type]}
                    </Badge>
                    {overdue && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5" /> Vencido
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(d.dueDate)} · {d.owner}
                    {d.status === "cumprido" && d.completedAt
                      ? ` · cumprido em ${formatDate(d.completedAt)}`
                      : d.status !== "pendente"
                        ? ` · ${DEADLINE_STATUS[d.status]}`
                        : ""}
                  </p>
                </div>
                {d.status === "pendente" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateDeadline.isPending}
                    onClick={() =>
                      updateDeadline.mutate({
                        id: d.id,
                        patch: { status: "cumprido", completedAt: todayIso() },
                      })
                    }
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cumprir
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
