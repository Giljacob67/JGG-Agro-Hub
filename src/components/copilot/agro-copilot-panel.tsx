import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COPILOT_LEGAL_NOTICE, COPILOT_PROMPTS } from "@shared/agro/copilot";
import { ROUTES } from "@/lib/routes";

export function AgroCopilotPanel() {
  const highlights = COPILOT_PROMPTS.slice(0, 3);

  return (
    <section className="executive-panel p-6 md:p-7">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/8 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <p className="text-label-caps text-primary/80">IA Agro</p>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Agro Copilot</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Camada proprietária de inteligência do Command Center. Apoia análise
            comercial, jurídica e operacional com leituras derivadas da carteira e
            da base de conhecimento interna.
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-accent/40 pl-3">
            {COPILOT_LEGAL_NOTICE}
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <Button asChild className="shadow-none">
            <Link href={ROUTES.copilot}>
              Abrir Agro Copilot
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="shadow-none">
            <Link href={ROUTES.knowledge}>Base de Conhecimento</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-border/70 grid sm:grid-cols-3 gap-3">
        {highlights.map((prompt) => (
          <Link
            key={prompt.id}
            href={`${ROUTES.copilot}?prompt=${prompt.id}`}
            className="surface-inset px-4 py-3 hover:border-primary/25 transition-colors"
          >
            <p className="text-xs font-semibold text-foreground">{prompt.label}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug line-clamp-2">
              {prompt.text}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}