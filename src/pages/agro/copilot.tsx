import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CopilotPromptBox } from "@/components/copilot/copilot-prompt-box";
import { CopilotResponseCard } from "@/components/copilot/copilot-response-card";
import { CopilotSuggestedPrompts } from "@/components/copilot/copilot-suggested-prompts";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { Button } from "@/components/ui/button";
import { useCopilotQuery } from "@/hooks/use-copilot";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCrmStats } from "@/hooks/use-crm-queries";
import { buildCopilotContextOptions } from "@/lib/copilot-context";
import {
  COPILOT_KNOWLEDGE_NOTICE,
  COPILOT_LEGAL_NOTICE,
  COPILOT_PROMPTS,
} from "@shared/agro/copilot";
import type { CopilotContextEntity, CopilotPrompt, CopilotResponse } from "@shared/agro/types";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AgroCopilotPage() {
  usePageTitle("Agro Copilot");
  const [location] = useLocation();
  const { data: stats, isLoading: statsLoading } = useCrmStats();
  const copilot = useCopilotQuery();
  const [responses, setResponses] = useState<CopilotResponse[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  const urlPrompt = useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    return COPILOT_PROMPTS.find((p) => p.id === params.get("prompt")) ?? null;
  }, [location]);

  const contextOptions = stats ? buildCopilotContextOptions(stats) : [];

  async function runQuery(query: string, contextEntity: CopilotContextEntity | null) {
    const result = await copilot.mutateAsync({
      query,
      contextEntity,
      history: conversationHistory,
    });
    setResponses((prev) => [result, ...prev]);
    setConversationHistory((prev) => [
      ...prev,
      { role: "user", content: query },
      { role: "assistant", content: result.synthesis },
    ]);
  }

  function handlePromptSelect(prompt: CopilotPrompt) {
    void runQuery(prompt.text, null);
  }

  function clearHistory() {
    setConversationHistory([]);
    setResponses([]);
  }

  if (statsLoading) {
    return (
      <AppShell>
        <CrmLoadingState label="Carregando Agro Copilot…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[88rem] mx-auto space-y-8">
        <header className="command-hero p-6 md:p-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl border border-primary/20 bg-primary/8 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="max-w-3xl">
              <p className="text-label-caps text-primary/80">JGG Agro Command Center</p>
              <h1 className="text-2xl font-semibold tracking-tight mt-1">Agro Copilot</h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Assistente interno para apoiar análise comercial, jurídica e operacional
                da carteira Agro. Integra leituras do CRM e da Base de Conhecimento.
              </p>
            </div>
          </div>

          <div className="mt-5 grid md:grid-cols-2 gap-3">
            <div className="surface-inset px-4 py-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {COPILOT_LEGAL_NOTICE}
              </p>
            </div>
            <div className="surface-inset px-4 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {COPILOT_KNOWLEDGE_NOTICE}
              </p>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CopilotPromptBox
              key={urlPrompt?.id ?? "default"}
              onSubmit={(query, context) => void runQuery(query, context)}
              loading={copilot.isPending}
              contextOptions={contextOptions}
              seedPrompt={urlPrompt?.text ?? ""}
            />
            {urlPrompt && responses.length === 0 && !copilot.isPending && (
              <button
                type="button"
                onClick={() => handlePromptSelect(urlPrompt)}
                className="w-full text-left surface-inset px-4 py-3 text-sm text-primary hover:border-primary/25 transition-colors"
              >
                Executar prompt sugerido: <span className="font-semibold">{urlPrompt.label}</span>
              </button>
            )}
            <CopilotSuggestedPrompts
              prompts={COPILOT_PROMPTS}
              onSelect={handlePromptSelect}
              disabled={copilot.isPending}
            />
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-label-caps">Análises geradas</p>
              {responses.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Limpar histórico
                </Button>
              )}
            </div>
            {conversationHistory.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {conversationHistory.length / 2} mensagem(ns) no histórico
              </p>
            )}
            {responses.length === 0 ? (
              <div className="surface-panel p-8 text-center border-dashed">
                <p className="text-sm text-muted-foreground">
                  Selecione um prompt sugerido ou faça uma pergunta para gerar a primeira
                  análise simulada.
                </p>
              </div>
            ) : (
              responses.map((response) => (
                <CopilotResponseCard key={response.id} response={response} />
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}