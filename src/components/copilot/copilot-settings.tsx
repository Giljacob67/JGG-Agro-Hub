import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCopilotConfig, useUpdateCopilotConfig } from "@/hooks/use-copilot";
import type { LlmProviderId } from "@shared/agro/types";

const MODEL_PRESETS: Record<LlmProviderId, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini"],
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro"],
  ollama: ["gpt-oss:120b", "llama3.3"],
  groq: ["llama-3.3-70b-versatile"],
  openrouter: ["anthropic/claude-sonnet-4.6", "openai/gpt-4o"],
};

interface Props {
  canEdit: boolean;
}

export function CopilotSettings({ canEdit }: Props) {
  const { data, isLoading, isError } = useCopilotConfig();
  const update = useUpdateCopilotConfig();

  const [provider, setProvider] = useState<LlmProviderId | "">("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0.3);

  useEffect(() => {
    if (data?.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProvider(data.current.provider);
      setModel(data.current.model);
      setTemperature(data.current.temperature ?? 0.3);
    } else if (data && provider === "") {
      const firstAvailable = data.providers.find((p) => p.available);
      if (firstAvailable) setProvider(firstAvailable.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isError) {
    return (
      <div className="surface-panel p-5 flex items-center gap-2 text-sm text-accent">
        <AlertTriangle className="w-4 h-4" /> Não foi possível carregar a
        configuração da IA.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="surface-panel p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando configuração da IA…
      </div>
    );
  }

  const active = data.source !== "none" && data.current;
  const currentLabel = data.current
    ? data.providers.find((p) => p.id === data.current?.provider)?.label ??
      data.current.provider
    : null;

  const selectedAvailable = data.providers.find(
    (p) => p.id === provider,
  )?.available;
  const canSubmit =
    canEdit &&
    data.dbEnabled &&
    !!provider &&
    !!model.trim() &&
    !!selectedAvailable &&
    !update.isPending;

  function handleSave() {
    if (!provider) return;
    update.mutate({ provider, model: model.trim(), temperature });
  }

  return (
    <div className="surface-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label-caps">Provedor de IA</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            As chaves de API ficam no servidor. Aqui você só seleciona entre os
            provedores já habilitados.
          </p>
        </div>
        {active ? (
          <Badge variant="success" className="shrink-0">
            <ShieldCheck className="w-3 h-3 mr-1" />
            IA ativa
          </Badge>
        ) : (
          <Badge variant="warning" className="shrink-0">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Fallback
          </Badge>
        )}
      </div>

      <div className="surface-inset px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        {active ? (
          <>
            Respostas geradas por <span className="font-semibold text-foreground">{currentLabel}</span>
            {data.current ? ` · ${data.current.model}` : ""}{" "}
            <span className="opacity-70">
              (origem: {data.source === "db" ? "configuração salva" : "variáveis de ambiente"})
            </span>
          </>
        ) : (
          <>
            Nenhum provedor de IA disponível — o Copilot opera em modo de
            palavras-chave (resultados simulados). Configure uma credencial no
            servidor para ativar a IA generativa.
          </>
        )}
      </div>

      <div className="surface-inset px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        Embeddings (busca semântica):{" "}
        <span className="font-semibold text-foreground">{data.embeddings.modelId}</span>{" "}
        {data.embeddings.available ? "· ativo" : "· indisponível"}
      </div>

      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          Apenas perfis de gestão podem alterar o provedor.
        </p>
      )}

      {canEdit && !data.dbEnabled && (
        <p className="text-xs text-accent">
          A alteração runtime exige banco de dados configurado. No ambiente atual
          a configuração vem das variáveis de ambiente.
        </p>
      )}

      {canEdit && data.dbEnabled && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Provedor
            </label>
            <select
              value={provider}
              onChange={(e) => {
                const next = e.target.value as LlmProviderId;
                setProvider(next);
                if (!model) setModel(MODEL_PRESETS[next]?.[0] ?? "");
              }}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {data.providers.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.available}>
                  {p.label}
                  {p.available ? "" : " — sem credencial"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Modelo
            </label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="ex.: claude-sonnet-4-6"
              list="copilot-model-presets"
            />
            <datalist id="copilot-model-presets">
              {(provider ? MODEL_PRESETS[provider] ?? [] : []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex justify-between">
              <span>Temperatura</span>
              <span className="tabular-nums">{temperature.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Menor = respostas mais conservadoras e determinísticas.
            </p>
          </div>

          {update.isError && (
            <p className="text-xs text-red-600">
              {(update.error as Error).message}
            </p>
          )}
          {update.isSuccess && !update.isPending && (
            <p className="text-xs text-primary">Configuração salva.</p>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!canSubmit}
            className="w-full"
          >
            {update.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Salvar configuração
          </Button>
        </div>
      )}
    </div>
  );
}
