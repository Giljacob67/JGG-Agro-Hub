import { Link } from "wouter";
import { Building2, CheckSquare, Scale, Target, UserPlus } from "lucide-react";
import { ROUTES } from "@/lib/routes";

const ACTIONS = [
  { label: "Novo lead", href: ROUTES.crm.leads, icon: UserPlus },
  { label: "Contas", href: ROUTES.crm.accounts, icon: Building2 },
  { label: "Pipeline", href: ROUTES.crm.opportunities, icon: Target },
  { label: "Demandas", href: ROUTES.crm.matters, icon: Scale },
  { label: "Tarefas", href: ROUTES.crm.tasks, icon: CheckSquare },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <action.icon className="w-3.5 h-3.5" />
          {action.label}
        </Link>
      ))}
    </div>
  );
}