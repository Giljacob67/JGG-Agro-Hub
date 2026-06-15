import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConvertLead } from "@/hooks/use-crm-queries";
import { ROUTES } from "@/lib/routes";
import type { Lead } from "@/lib/crm-types";

interface ConvertLeadCardProps {
  lead: Lead;
}

export function ConvertLeadCard({ lead }: ConvertLeadCardProps) {
  const [, navigate] = useLocation();
  const convertLead = useConvertLead();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [valueBrl, setValueBrl] = useState("");
  const [practice, setPractice] = useState(lead.interestArea ?? "");
  const [error, setError] = useState<string | null>(null);

  if (lead.convertedOpportunityId) {
    return (
      <Card className="p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Lead convertido em oportunidade{" "}
          <span className="font-mono">{lead.convertedOpportunityId}</span>.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href={ROUTES.crm.opportunityDetail(lead.convertedOpportunityId)}>
            Ver oportunidade <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </Card>
    );
  }

  if (lead.status === "descartado") return null;

  function submit() {
    setError(null);
    convertLead.mutate(
      {
        id: lead.id,
        input: {
          title: title.trim() || undefined,
          valueBrl: valueBrl ? Number(valueBrl) : undefined,
          practice: practice.trim() || undefined,
        },
      },
      {
        onSuccess: (result) => {
          navigate(ROUTES.crm.opportunityDetail(result.opportunity.id));
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Erro ao converter lead");
        },
      },
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">Converter em oportunidade</p>
        </div>
        <Button
          variant={showForm ? "ghost" : "default"}
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancelar" : "Converter"}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3">
          <div>
            <label htmlFor="convert-title" className="text-xs text-muted-foreground">
              Título da oportunidade (opcional)
            </label>
            <input
              id="convert-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${lead.interestArea || lead.legalPain || "Nova oportunidade"} — ${lead.name}`}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="convert-value" className="text-xs text-muted-foreground">
                Valor estimado (R$)
              </label>
              <input
                id="convert-value"
                type="number"
                min="0"
                value={valueBrl}
                onChange={(e) => setValueBrl(e.target.value)}
                placeholder="0"
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="convert-practice" className="text-xs text-muted-foreground">
                Área de atuação
              </label>
              <input
                id="convert-practice"
                value={practice}
                onChange={(e) => setPractice(e.target.value)}
                placeholder="Ex.: Direito Agrário"
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={convertLead.isPending}>
              {convertLead.isPending ? "Convertendo…" : "Confirmar conversão"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
