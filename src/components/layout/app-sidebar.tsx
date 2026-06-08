import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Database, LogOut, Menu, X } from "lucide-react";
import { NAV_GROUPS } from "@/lib/navigation";
import { ROUTES, isCrmPath } from "@/lib/routes";
import { useAuth } from "@/contexts/auth-context";
import { useCrmStats } from "@/hooks/use-crm-queries";
import { OperationCriticalPanel } from "@/components/command-center/operation-critical-panel";
import { getCriticalOperationCount } from "@/lib/command-intelligence";
import {
  JGG_AGRO_COMMAND_CENTER,
  JGG_GROUP_NAME,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, canAccess } = useAuth();
  const { data: stats } = useCrmStats();
  const inCrm = isCrmPath(location);

  const criticalCount = stats ? getCriticalOperationCount(stats) : 0;
  const overdueTasks = stats?.overdueTasks ?? 0;

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      canAccess(item.resource ?? (group.id === "crm" ? "crm" : "stats")),
    ),
  })).filter((group) => group.items.length > 0);

  const nav = (
    <>
      <div className="px-4 py-5 border-b border-sidebar-border">
        <Link href={ROUTES.commandCenter} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-sidebar-accent/80 ring-1 ring-sidebar-foreground/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-sidebar-foreground tracking-tight">
              JG
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground leading-snug">
              {JGG_AGRO_COMMAND_CENTER}
            </p>
            <p className="text-[10px] text-sidebar-foreground/55 uppercase tracking-[0.12em] mt-0.5">
              {JGG_GROUP_NAME}
            </p>
          </div>
        </Link>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-muted/60 px-2.5 py-2">
          <Database className="w-3.5 h-3.5 text-sidebar-foreground/50 shrink-0" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/60">
            Mock / Demo data
          </span>
        </div>

        {user && (
          <p className="text-[11px] text-sidebar-foreground/55 mt-3 leading-snug">
            {user.name}
            <span className="text-sidebar-foreground/35"> · </span>
            {user.role}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {visibleGroups.map((group) => (
          <nav key={group.id} aria-label={group.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.path === ROUTES.crm.root
                    ? inCrm && location === ROUTES.crm.root
                    : location === item.path || location.startsWith(item.path + "/");
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent/70 text-sidebar-foreground"
                        : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-muted/80",
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0 opacity-80" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ))}
      </div>

      <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
        <OperationCriticalPanel
          criticalCount={criticalCount}
          overdueTasks={overdueTasks}
        />

        <Link
          href={ROUTES.institucional}
          className="block text-xs text-sidebar-foreground/55 hover:text-sidebar-foreground transition-colors"
        >
          Página institucional
        </Link>
        {user && (
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 text-xs text-sidebar-foreground/55 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-border/50 bg-background/95 backdrop-blur">
        <span className="text-sm font-semibold">{JGG_AGRO_COMMAND_CENTER}</span>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="p-2 rounded-md hover:bg-muted/60"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-sidebar flex flex-col"
          role="dialog"
          aria-label="Menu de navegação"
        >
          <div className="flex justify-end p-4">
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar">
              <X className="w-5 h-5 text-sidebar-foreground" />
            </button>
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto">{nav}</div>
        </div>
      )}

      <aside className="hidden md:flex md:w-64 lg:w-[17rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
        {nav}
      </aside>
    </>
  );
}