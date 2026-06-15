import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/use-theme";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

interface ThemeToggleProps {
  variant?: "default" | "sidebar" | "compact";
  className?: string;
}

export function ThemeToggle({ variant = "default", className }: ThemeToggleProps) {
  const { preference, resolved, setPreference } = useTheme();

  if (variant === "compact") {
    const Icon = resolved === "dark" ? Sun : Moon;
    return (
      <button
        type="button"
        onClick={() => setPreference(resolved === "dark" ? "light" : "dark")}
        className={cn(
          "p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
          className,
        )}
        aria-label={resolved === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/45">
          Aparência
        </p>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-sidebar-border bg-sidebar-muted/40 p-1">
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreference(value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-1.5 py-2 text-[10px] font-medium transition-colors",
                preference === value
                  ? "bg-sidebar-accent/70 text-sidebar-foreground"
                  : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-muted/60",
              )}
              aria-pressed={preference === value}
              aria-label={`Tema ${label.toLowerCase()}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5",
        className,
      )}
      role="group"
      aria-label="Tema da interface"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setPreference(value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            preference === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={preference === value}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
