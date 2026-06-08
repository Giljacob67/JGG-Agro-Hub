import {
  JGG_AGRO_HUB_NAME,
  JGG_GROUP_NAME,
  JGG_TRIBUTARIO_LABEL,
  JGG_TRIBUTARIO_URL,
} from "@/lib/brand";

export function AgroFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold text-foreground">
            {JGG_AGRO_HUB_NAME}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{JGG_GROUP_NAME}</p>
        </div>
        <nav
          className="flex items-center gap-4 text-xs text-muted-foreground"
          aria-label="Links do rodapé"
        >
          <a
            href="/command-center"
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1"
          >
            Hub interno
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={JGG_TRIBUTARIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1"
          >
            {JGG_TRIBUTARIO_LABEL}
          </a>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {year} {JGG_GROUP_NAME}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}