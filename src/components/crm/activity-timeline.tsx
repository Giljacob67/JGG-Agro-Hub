import { useState } from "react";
import { Calendar, Mail, MessageCircle, Phone, StickyNote, Users, Zap, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import { useActivities, useCreateActivity } from "@/hooks/use-crm-queries";
import { ACTIVITY_TYPE, formatDate } from "@/lib/crm-labels";
import type { ActivityEntityType, ActivityType } from "@/lib/crm-types";

const TYPE_ICONS: Record<ActivityType, typeof Phone> = {
  ligacao: Phone,
  reuniao: Users,
  email: Mail,
  whatsapp: MessageCircle,
  visita: MapPin,
  nota: StickyNote,
  sistema: Zap,
};

const REGISTRABLE_TYPES: ActivityType[] = [
  "ligacao",
  "reuniao",
  "email",
  "whatsapp",
  "visita",
  "nota",
];

interface ActivityTimelineProps {
  entityType: ActivityEntityType;
  entityId: string;
}

export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  const { user } = useAuth();
  const { data: activities, isLoading } = useActivities(entityId, entityType);
  const createActivity = useCreateActivity();

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ActivityType>("ligacao");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function submit() {
    if (!summary.trim()) return;
    createActivity.mutate(
      {
        entityType,
        entityId,
        type,
        summary: summary.trim(),
        date,
        owner: user?.name ?? "Equipe Agro",
      },
      {
        onSuccess: () => {
          setSummary("");
          setShowForm(false);
        },
      },
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Interações</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancelar" : "Registrar interação"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 mb-3 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="activity-type" className="text-xs text-muted-foreground">
                Tipo
              </label>
              <select
                id="activity-type"
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {REGISTRABLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACTIVITY_TYPE[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="activity-date" className="text-xs text-muted-foreground">
                Data
              </label>
              <input
                id="activity-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="activity-summary" className="text-xs text-muted-foreground">
              Resumo
            </label>
            <textarea
              id="activity-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="O que foi tratado?"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={submit}
              disabled={!summary.trim() || createActivity.isPending}
            >
              {createActivity.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando interações…</p>
      ) : !activities || activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma interação registrada ainda.
        </p>
      ) : (
        <ol className="space-y-2">
          {activities.map((a) => {
            const Icon = TYPE_ICONS[a.type] ?? StickyNote;
            return (
              <li key={a.id}>
                <Card className="p-4 flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-md border border-border p-1.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed">{a.summary}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                      <Badge variant={a.type === "sistema" ? "muted" : "outline"}>
                        {ACTIVITY_TYPE[a.type]}
                      </Badge>
                      <Calendar className="w-3 h-3" />
                      {formatDate(a.date)} · {a.owner}
                    </p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
