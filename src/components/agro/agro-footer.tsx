import { TAX_HUB_URL } from "@/lib/agro-content";

export function AgroFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold text-foreground">JGG Agro</p>
          <p className="text-xs text-muted-foreground mt-1">
            Estratégia jurídica para o agronegócio
          </p>
        </div>
        <nav
          className="flex items-center gap-4 text-xs text-muted-foreground"
          aria-label="Links do rodapé"
        >
          <a
            href="/"
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1"
          >
            Hub Agro
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={TAX_HUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1"
          >
            Hub Tributário
          </a>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {year} JGG. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}