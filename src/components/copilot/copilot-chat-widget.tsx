import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/use-auth";
import { useCopilotQuery } from "@/hooks/use-copilot";
import type { CopilotSource } from "@shared/agro/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  risks?: string[];
  nextSteps?: string[];
  sources?: CopilotSource[];
  simulated?: boolean;
}

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Olá! Sou o Agro Copilot. Pergunte sobre demandas, oportunidades ou a base de conhecimento jurídica.",
};

export function CopilotChatWidget() {
  const { user, canAccess } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const copilot = useCopilotQuery();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, copilot.isPending]);

  // Só renderiza para quem tem acesso ao copilot.
  if (!user || !canAccess("copilot")) return null;

  const send = () => {
    const query = input.trim();
    if (!query || copilot.isPending) return;

    const history = messages
      .filter((m) => m !== WELCOME)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInput("");

    copilot.mutate(
      { query, history },
      {
        onSuccess: (res) => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: res.synthesis,
              risks: res.risks,
              nextSteps: res.nextSteps,
              sources: res.sources,
              simulated: res.simulated,
            },
          ]);
        },
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                err instanceof Error
                  ? `Erro ao consultar a IA: ${err.message}`
                  : "Erro ao consultar a IA.",
            },
          ]);
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:opacity-90"
          aria-label="Abrir Agro Copilot"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden sm:inline">Copilot</span>
        </button>
      )}

      {/* Painel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[560px] max-h-[calc(100vh-2.5rem)] w-[calc(100vw-2.5rem)] max-w-sm flex-col rounded-xl border border-border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Agro Copilot</span>
              <Badge variant="secondary" className="text-[10px]">
                IA + Base
              </Badge>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Thread */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {m.risks && m.risks.length > 0 && (
                    <div className="mt-2 border-t border-border/40 pt-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
                        Riscos
                      </p>
                      <ul className="mt-1 list-disc pl-4 text-xs">
                        {m.risks.map((r, j) => (
                          <li key={j}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.nextSteps && m.nextSteps.length > 0 && (
                    <div className="mt-2 border-t border-border/40 pt-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
                        Próximos passos
                      </p>
                      <ul className="mt-1 list-disc pl-4 text-xs">
                        {m.nextSteps.map((s, j) => (
                          <li key={j}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-border/40 pt-2">
                      {m.sources.map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 rounded bg-background/60 px-1.5 py-0.5 text-[10px]"
                          title={s.excerpt}
                        >
                          <BookOpen className="h-3 w-3" />
                          {s.title}
                        </span>
                      ))}
                    </div>
                  )}

                  {m.simulated && (
                    <p className="mt-1 text-[10px] italic opacity-60">
                      modo offline (sem modelo configurado)
                    </p>
                  )}
                </div>
              </div>
            ))}

            {copilot.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pensando…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte ao Copilot…"
                rows={1}
                className="max-h-28 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                size="icon"
                onClick={send}
                disabled={!input.trim() || copilot.isPending}
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Enter envia · Shift+Enter quebra linha · respostas de IA, confira sempre.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
