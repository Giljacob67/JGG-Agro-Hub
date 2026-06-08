import { Link } from "wouter";
import { AlertCircle, ArrowRight, ListChecks, ShieldAlert } from "lucide-react";
import type { CopilotResponse } from "@shared/agro/types";
import { Badge } from "@/components/ui/badge";
import { CopilotSourceList } from "./copilot-source-list";
import { ROUTES } from "@/lib/routes";

function entityHref(type: CopilotResponse["relatedEntities"][0]["type"], id: string) {
  switch (type) {
    case "conta":
      return ROUTES.crm.accountDetail(id);
    case "oportunidade":
      return ROUTES.crm.opportunityDetail(id);
    case "demanda":
      return ROUTES.crm.matterDetail(id);
    case "lead":
      return ROUTES.crm.leadDetail(id);
  }
}

interface CopilotResponseCardProps {
  response: CopilotResponse;
}

export function CopilotResponseCard({ response }: CopilotResponseCardProps) {
  return (
    <article className="executive-panel p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-label-caps text-primary/80">Análise Agro Copilot</p>
          <p className="text-xs text-muted-foreground mt-1 italic">
            “{response.query}”
          </p>
        </div>
        <Badge variant="warning">Simulada</Badge>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">Síntese</p>
        <p className="text-sm text-foreground/85 mt-2 leading-relaxed">
          {response.synthesis}
        </p>
      </div>

      {response.risks.length > 0 && (
        <div>
          <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
            <ShieldAlert className="w-3.5 h-3.5 text-accent" />
            Riscos identificados
          </p>
          <ul className="mt-2 space-y-1.5">
            {response.risks.map((risk) => (
              <li
                key={risk}
                className="text-sm text-muted-foreground flex gap-2 leading-snug"
              >
                <span className="text-accent shrink-0">·</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {response.nextSteps.length > 0 && (
        <div>
          <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
            <ListChecks className="w-3.5 h-3.5 text-primary" />
            Próximos passos sugeridos
          </p>
          <ol className="mt-2 space-y-1.5 list-decimal list-inside">
            {response.nextSteps.map((step) => (
              <li key={step} className="text-sm text-muted-foreground leading-snug">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      <CopilotSourceList sources={response.sources} />

      {response.relatedEntities.length > 0 && (
        <div>
          <p className="text-label-caps mb-2">Entidades relacionadas (CRM)</p>
          <div className="flex flex-wrap gap-2">
            {response.relatedEntities.map((entity) => (
              <Link
                key={`${entity.type}-${entity.id}`}
                href={entityHref(entity.type, entity.id)}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-border/80 bg-muted/30 hover:border-primary/25 hover:text-primary transition-colors"
              >
                {entity.name}
                <ArrowRight className="w-3 h-3 opacity-60" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/8 px-3 py-2.5">
        <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {response.disclaimer}
        </p>
      </div>
    </article>
  );
}