import { BookOpen } from "lucide-react";
import type { CopilotSource } from "@shared/agro/types";
import { Link } from "wouter";
import { ROUTES } from "@/lib/routes";

interface CopilotSourceListProps {
  sources: CopilotSource[];
}

export function CopilotSourceList({ sources }: CopilotSourceListProps) {
  if (sources.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-label-caps flex items-center gap-1.5">
        <BookOpen className="w-3 h-3" />
        Fontes consultadas
      </p>
      <ul className="space-y-2">
        {sources.map((source) => (
          <li key={source.id} className="surface-inset px-3 py-2.5">
            <Link
              href={ROUTES.knowledge}
              className="text-xs font-semibold text-foreground hover:text-primary"
            >
              {source.title}
            </Link>
            <p className="text-[11px] text-muted-foreground mt-1">
              {source.categoryLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
              {source.excerpt}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}