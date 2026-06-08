import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "cc-kpis", label: "KPIs" },
  { id: "cc-intelligence", label: "Inteligência" },
  { id: "cc-pipeline", label: "Pipeline" },
  { id: "cc-portfolio", label: "Carteira" },
  { id: "cc-risks", label: "Riscos" },
] as const;

export function CommandCenterSubNav() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { root: main, rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );

    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Seções do Command Center"
      className="sticky top-0 z-10 -mx-1 px-1 py-2 mb-2 bg-background/90 backdrop-blur-sm border-b border-border/60"
    >
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shrink-0 pr-2 hidden sm:inline">
          Explorar
        </span>
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeId === section.id
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}