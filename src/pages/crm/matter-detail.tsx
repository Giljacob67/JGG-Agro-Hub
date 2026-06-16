import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { DeadlinesPanel } from "@/components/crm/deadlines-panel";
import { DocumentManager } from "@/components/crm/document-manager";
import { DocumentChecklist } from "@/components/crm/document-checklist";
import { TimeEntryManager } from "@/components/crm/time-entry-manager";
import { DetailBackLink } from "@/components/crm/detail-back-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useMatter,
  useRelatedTasks,
  useUpdateMatter,
} from "@/hooks/use-crm-queries";
import {
  MATTER_PHASE,
  MATTER_STATUS,
  MATTER_URGENCY,
  RISK_LEVEL,
  formatBrl,
  formatDate,
  isCriticalDeadline,
  riskBadgeVariant,
} from "@/lib/crm-labels";
import type { Matter, MatterPhase, MatterStatus, RiskLevel } from "@shared/agro/types";
import { ROUTES } from "@/lib/routes";

function ProceduralDataCard({ matter }: { matter: Matter }) {
  const updateMatter = useUpdateMatter();
  const [editing, setEditing] = useState(false);
  const [cnjNumber, setCnjNumber] = useState(matter.cnjNumber ?? "");
  const [court, setCourt] = useState(matter.court ?? "");
  const [phase, setPhase] = useState<MatterPhase | "">(matter.phase ?? "");
  const [opposingParty, setOpposingParty] = useState(matter.opposingParty ?? "");
  const [claimValue, setClaimValue] = useState(
    matter.claimValueBrl != null ? String(matter.claimValueBrl) : "",
  );

  function save() {
    updateMatter.mutate(
      {
        id: matter.id,
        patch: {
          cnjNumber: cnjNumber.trim() || null,
          court: court.trim() || null,
          phase: phase || null,
          opposingParty: opposingParty.trim() || null,
          claimValueBrl: claimValue ? Number(claimValue) : null,
        },
      },
      { onSuccess: () => { setEditing(false); toast.success("Dados processuais salvos!"); }, onError: () => toast.error("Erro ao salvar dados") },
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Dados processuais
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Cancelar" : "Editar"}
        </Button>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="mt-cnj" className="text-xs text-muted-foreground">
                Número CNJ
              </label>
              <input
                id="mt-cnj"
                value={cnjNumber}
                onChange={(e) => setCnjNumber(e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="mt-phase" className="text-xs text-muted-foreground">
                Fase
              </label>
              <select
                id="mt-phase"
                value={phase}
                onChange={(e) => setPhase(e.target.value as MatterPhase | "")}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">—</option>
                {Object.entries(MATTER_PHASE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="mt-court" className="text-xs text-muted-foreground">
              Juízo / órgão
            </label>
            <input
              id="mt-court"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              placeholder="Ex.: 2ª Vara Cível de Sorriso/MT"
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="mt-opposing" className="text-xs text-muted-foreground">
                Parte contrária
              </label>
              <input
                id="mt-opposing"
                value={opposingParty}
                onChange={(e) => setOpposingParty(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="mt-claim" className="text-xs text-muted-foreground">
                Valor da causa (R$)
              </label>
              <input
                id="mt-claim"
                type="number"
                min="0"
                value={claimValue}
                onChange={(e) => setClaimValue(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={save} disabled={updateMatter.isPending}>
              {updateMatter.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Número CNJ</p>
            <p className="font-mono">{matter.cnjNumber || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fase</p>
            <p>{matter.phase ? MATTER_PHASE[matter.phase] : "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Juízo / órgão</p>
            <p>{matter.court || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Parte contrária</p>
            <p>{matter.opposingParty || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor da causa</p>
            <p>
              {matter.claimValueBrl != null ? formatBrl(matter.claimValueBrl) : "—"}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

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
                  updateMatter.mutate(
                    { id: matter.id, patch: { status: e.target.value as MatterStatus } },
                    { onSuccess: () => toast.success("Status atualizado!"), onError: () => toast.error("Erro ao atualizar") },
                  )
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
                  updateMatter.mutate(
                    { id: matter.id, patch: { risk: e.target.value as RiskLevel } },
                    { onSuccess: () => toast.success("Risco atualizado!"), onError: () => toast.error("Erro ao atualizar") },
                  )
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

          {matter.opportunityId && (
            <div className="pt-1">
              <Button variant="outline" size="sm" asChild>
                <Link href={ROUTES.crm.opportunityDetail(matter.opportunityId)}>
                  Oportunidade de origem ({matter.opportunityId}){" "}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </Card>

        <ProceduralDataCard matter={matter} key={`pd-${matter.id}`} />

        <DeadlinesPanel matterId={matter.id} />

        <DocumentManager entityType="matter" entityId={matter.id} matterId={matter.id} />

        <DocumentChecklist matterId={matter.id} />

        <TimeEntryManager matterId={matter.id} />

        <ActivityTimeline entityType="matter" entityId={matter.id} />

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