import { Link, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLead, useRelatedTasks, useUpdateLead } from "@/hooks/use-crm-queries";
import { LEAD_PRIORITY, LEAD_STATUS, TASK_STATUS, formatDate } from "@/lib/crm-labels";
import type { LeadStatus } from "@shared/agro/types";
import { ROUTES } from "@/lib/routes";

export default function CrmLeadDetailPage() {
  const [, params] = useRoute("/agro/crm/leads/:id");
  const id = params?.id ?? "";
  const { data: lead, isLoading, error } = useLead(id);
  const { data: tasks } = useRelatedTasks(id);
  const updateLead = useUpdateLead();

  usePageTitle(lead ? `Lead ${lead.id}` : "Lead");

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground p-6">Carregando lead…</p>
      </AppShell>
    );
  }

  if (error || !lead) {
    return (
      <AppShell>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">Lead não encontrado.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href={ROUTES.crm.leads}>
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={ROUTES.crm.leads}>
            <ArrowLeft className="w-3.5 h-3.5" /> Leads Agro
          </Link>
        </Button>

        <header>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{lead.id}</p>
              <h1 className="text-2xl font-bold mt-1">{lead.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lead.region} · {lead.crop}
              </p>
            </div>
            <Badge variant="outline">{LEAD_STATUS[lead.status]}</Badge>
          </div>
        </header>

        <Card className="p-5 space-y-4">
          <div>
            <label htmlFor="lead-status" className="text-xs text-muted-foreground">
              Status comercial
            </label>
            <select
              id="lead-status"
              value={lead.status}
              disabled={updateLead.isPending}
              onChange={(e) =>
                updateLead.mutate({
                  id: lead.id,
                  patch: { status: e.target.value as LeadStatus },
                })
              }
              className="mt-1 h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm"
            >
              {Object.entries(LEAD_STATUS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Responsável</p>
              <p className="font-medium">{lead.owner}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contato</p>
              <p className="font-medium">{lead.contact}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Origem</p>
              <p>{lead.source}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Próximo contato</p>
              <p>{lead.nextContact ? formatDate(lead.nextContact) : "—"}</p>
            </div>
            {lead.leadType && (
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p>{lead.leadType}</p>
              </div>
            )}
            {lead.priority && (
              <div>
                <p className="text-xs text-muted-foreground">Prioridade</p>
                <p>{LEAD_PRIORITY[lead.priority]}</p>
              </div>
            )}
            {lead.legalPain && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Principal dor jurídica</p>
                <p>{lead.legalPain}</p>
              </div>
            )}
            {lead.interestArea && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Área de interesse</p>
                <p>{lead.interestArea}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Notas</p>
            <p className="text-sm leading-relaxed">{lead.notes}</p>
          </div>
        </Card>

        {tasks && tasks.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3">Tarefas vinculadas</h2>
            <div className="space-y-2">
              {tasks.map((t) => (
                <Card key={t.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.owner} · {formatDate(t.dueDate)}
                    </p>
                  </div>
                  <Badge variant="outline">{TASK_STATUS[t.status]}</Badge>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}