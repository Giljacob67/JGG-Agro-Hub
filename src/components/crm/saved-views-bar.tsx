import { useState } from "react";
import { Bookmark, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SavedView } from "@/hooks/use-saved-views";

interface SavedViewsBarProps<TState> {
  views: SavedView<TState>[];
  currentState: TState;
  /** Estado considerado "vazio" (sem filtros) — desabilita salvar. */
  isEmptyState?: boolean;
  onApply: (state: TState) => void;
  onSave: (name: string) => void;
  onRemove: (id: string) => void;
}

export function SavedViewsBar<TState>({
  views,
  currentState,
  isEmptyState = false,
  onApply,
  onSave,
  onRemove,
}: SavedViewsBarProps<TState>) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const currentJson = JSON.stringify(currentState);
  const activeId = views.find((v) => JSON.stringify(v.state) === currentJson)?.id;

  function commit() {
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
    setName("");
    setNaming(false);
  }

  if (views.length === 0 && isEmptyState && !naming) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Bookmark className="w-3.5 h-3.5" /> Visões
      </span>
      {views.map((view) => (
        <span
          key={view.id}
          className={cn(
            "group inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
            view.id === activeId
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border hover:bg-muted/40",
          )}
        >
          <button
            type="button"
            onClick={() => onApply(view.state)}
            className="font-medium"
          >
            {view.name}
          </button>
          <button
            type="button"
            onClick={() => onRemove(view.id)}
            aria-label={`Remover visão ${view.name}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {naming ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setName("");
                setNaming(false);
              }
            }}
            placeholder="Nome da visão"
            className="h-7 w-36 rounded-md border border-border bg-background px-2 text-xs"
          />
          <Button size="sm" variant="ghost" onClick={commit} className="h-7 px-2">
            Salvar
          </Button>
        </span>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setNaming(true)}
          disabled={isEmptyState}
          className="h-7 px-2 text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Salvar visão atual
        </Button>
      )}
    </div>
  );
}
