import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CopilotContextEntity } from "@shared/agro/types";

interface ContextOption {
  value: string;
  label: string;
  entity: CopilotContextEntity | null;
}

interface CopilotPromptBoxProps {
  onSubmit: (query: string, context: CopilotContextEntity | null) => void;
  loading?: boolean;
  contextOptions?: ContextOption[];
  seedPrompt?: string;
}

export function CopilotPromptBox({
  onSubmit,
  loading,
  contextOptions = [],
  seedPrompt = "",
}: CopilotPromptBoxProps) {
  const [query, setQuery] = useState(seedPrompt);
  const [contextKey, setContextKey] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    const selected = contextOptions.find((o) => o.value === contextKey);
    onSubmit(trimmed, selected?.entity ?? null);
    setQuery("");
  }

  return (
    <form onSubmit={handleSubmit} className="surface-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg border border-primary/20 bg-primary/8 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Consulta ao Agro Copilot</p>
          <p className="text-xs text-muted-foreground">
            Análise comercial, jurídica e operacional da carteira Agro
          </p>
        </div>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ex.: Quais riscos exigem ação hoje?"
        disabled={loading}
        aria-label="Pergunta ao Agro Copilot"
      />

      {contextOptions.length > 0 && (
        <div>
          <label
            htmlFor="copilot-context"
            className="text-xs font-medium text-muted-foreground"
          >
            Vincular contexto (opcional)
          </label>
          <select
            id="copilot-context"
            value={contextKey}
            onChange={(e) => setContextKey(e.target.value)}
            disabled={loading}
            className="mt-1 flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm"
          >
            <option value="">Sem vínculo específico</option>
            {contextOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" disabled={loading || !query.trim()} className="shadow-none">
        {loading ? "Analisando…" : "Gerar análise"}
      </Button>
    </form>
  );
}