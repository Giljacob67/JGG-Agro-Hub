import { useEffect, useRef } from "react";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/use-auth";
import { useAiAssist } from "@/hooks/use-copilot";
import type { AiAssistEntityType, AiAssistTask } from "@shared/agro/types";

interface AiAssistPanelProps {
  task: AiAssistTask;
  entityType: AiAssistEntityType;
  entityId: string;
  /** Título do cartão (ex.: "Resumo IA"). */
  heading: string;
  /** Executa automaticamente ao montar (padrão: true). */
  autoRun?: boolean;
}

/**
 * Cartão de apoio por IA acoplado a um registro do CRM. Reusa o endpoint
 * /api/agro/ai-assist. Roda automaticamente ao abrir (autoRun) e permite
 * regenerar manualmente. Só renderiza para quem tem acesso ao copilot.
 */
export function AiAssistPanel({
  task,
  entityType,
  entityId,
  heading,
  autoRun = true,
}: AiAssistPanelProps) {
  const { user, canAccess } = useAuth();
  const assist = useAiAssist();
  const ranFor = useRef<string | null>(null);

  const allowed = Boolean(user && canAccess("copilot"));

  useEffect(() => {
    if (!allowed || !autoRun || !entityId) return;
    const key = `${task}:${entityId}`;
    if (ranFor.current === key) return;
    ranFor.current = key;
    assist.mutate({ task, entityType, entityId });
    // assist intentionally excluded — mutate identity stable, guard via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, autoRun, task, entityType, entityId]);

  if (!allowed) return null;

  const result = assist.data;

  return (
    <Card className="p-5 space-y-3 border-primary/30">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          {heading}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => assist.mutate({ task, entityType, entityId })}
          disabled={assist.isPending}
        >
          {assist.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">Regenerar</span>
        </Button>
      </div>

      {assist.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando análise…
        </div>
      )}

      {assist.isError && !assist.isPending && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {assist.error instanceof Error
            ? assist.error.message
            : "Falha ao gerar análise."}
        </p>
      )}

      {result && !assist.isPending && (
        <div className="space-y-2">
          {result.title && (
            <p className="text-sm font-semibold">{result.title}</p>
          )}
          {result.content && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {result.content}
            </p>
          )}
          {result.bullets.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {result.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
          <p className="pt-1 text-[11px] italic text-muted-foreground">
            {result.simulated ? "Modo offline · " : ""}
            {result.disclaimer}
          </p>
        </div>
      )}
    </Card>
  );
}
