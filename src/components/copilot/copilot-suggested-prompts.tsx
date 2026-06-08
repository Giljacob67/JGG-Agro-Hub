import type { CopilotPrompt } from "@shared/agro/types";
import { cn } from "@/lib/utils";

interface CopilotSuggestedPromptsProps {
  prompts: CopilotPrompt[];
  onSelect: (prompt: CopilotPrompt) => void;
  disabled?: boolean;
}

export function CopilotSuggestedPrompts({
  prompts,
  onSelect,
  disabled,
}: CopilotSuggestedPromptsProps) {
  return (
    <div className="space-y-3">
      <p className="text-label-caps">Sugestões de análise</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className={cn(
              "surface-inset px-3 py-3 text-left transition-colors",
              "hover:border-primary/25 hover:bg-muted/40",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <p className="text-xs font-semibold text-foreground">{prompt.label}</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
              {prompt.text}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}