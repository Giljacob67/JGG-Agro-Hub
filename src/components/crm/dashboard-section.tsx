import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardSectionProps {
  title: string;
  count?: number;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
}

export function DashboardSection({
  title,
  count,
  href,
  linkLabel = "Ver tudo",
  children,
}: DashboardSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {count !== undefined && (
            <Badge variant="muted" className="tabular-nums">
              {count}
            </Badge>
          )}
        </div>
        {href && (
          <Button variant="outline" size="sm" asChild className="shadow-none shrink-0">
            <Link href={href}>
              {linkLabel} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}