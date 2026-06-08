import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  href?: string;
  highlight?: boolean;
}

export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  href,
  highlight,
}: KpiCardProps) {
  const content = (
    <Card
      className={cn(
        "h-full transition-colors",
        href && "hover:border-primary/30 cursor-pointer",
        highlight && "border-accent/40 bg-accent/5",
      )}
    >
      <CardHeader className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-right min-w-0">
            <p className="text-xl md:text-2xl font-bold tabular-nums">{value}</p>
            {sublabel && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {sublabel}
              </p>
            )}
          </div>
        </div>
        <CardTitle className="text-sm font-medium mt-3 text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}