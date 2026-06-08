import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { MAIN_NAV, CRM_NAV } from "@/lib/navigation";
import { ROUTES, isCrmPath } from "@/lib/routes";
import { JGG_AGRO_HUB_NAME, JGG_AGRO_TAGLINE, JGG_GROUP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const inCrm = isCrmPath(location);

  const nav = (
    <>
      <div className="px-4 py-4 border-b border-border/50">
        <Link href={ROUTES.commandCenter} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/12 ring-1 ring-primary/25 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">JG</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {JGG_AGRO_HUB_NAME}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              {JGG_GROUP_NAME}
            </p>
          </div>
        </Link>
        <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
          {JGG_AGRO_TAGLINE}
        </p>
      </div>

      <nav className="px-3 py-4 space-y-1" aria-label="Navegação principal">
        {MAIN_NAV.map((item) => {
          const active =
            item.path === ROUTES.crm.root
              ? inCrm
              : location === item.path || location.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              href={
                item.path === ROUTES.crm.root
                  ? ROUTES.crm.leads
                  : item.path
              }
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {inCrm && (
        <nav
          className="px-3 pb-4 space-y-1 border-t border-border/40 pt-4 mx-3"
          aria-label="CRM Agro"
        >
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            CRM Agro
          </p>
          {CRM_NAV.map((item) => {
            const active = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="mt-auto px-4 py-4 border-t border-border/50">
        <Link
          href={ROUTES.institucional}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Página institucional
        </Link>
      </div>
    </>
  );

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-border/50 bg-background/95 backdrop-blur">
        <span className="text-sm font-semibold">{JGG_AGRO_HUB_NAME}</span>
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
          className="md:hidden fixed inset-0 z-50 bg-background/98 flex flex-col"
          role="dialog"
          aria-label="Menu de navegação"
        >
          <div className="flex justify-end p-4">
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto">{nav}</div>
        </div>
      )}

      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-border/50 bg-background/80 h-screen sticky top-0">
        {nav}
      </aside>
    </>
  );
}