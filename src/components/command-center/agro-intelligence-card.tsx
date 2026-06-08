import type { IntelligenceCardData } from "@/lib/command-intelligence";
import { cn } from "@/lib/utils";

interface AgroIntelligenceCardProps {
  data: IntelligenceCardData;
}

const severityAccent: Record<
  NonNullable<IntelligenceCardData["severity"]>,
  string
> = {
  neutral: "bg-primary/70",
  attention: "bg-accent",
  critical: "bg-red-500",
};

export function AgroIntelligenceCard({ data }: AgroIntelligenceCardProps) {
  const severity = data.severity ?? "neutral";

  return (
    <article className="surface-panel p-5 h-full flex flex-col">
      <div className="flex items-start gap-3">
        <span
          className={cn("w-1 self-stretch rounded-full shrink-0", severityAccent[severity])}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-label-caps">{data.title}</p>
          <p className="text-lg font-semibold tracking-tight mt-2 text-foreground">
            {data.metric}
          </p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {data.detail}
          </p>
        </div>
      </div>
    </article>
  );
}