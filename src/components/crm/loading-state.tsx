export function CrmLoadingState({ label = "Carregando dados…" }: { label?: string }) {
  return (
    <p className="text-sm text-muted-foreground py-8 text-center">{label}</p>
  );
}

/** Bloco base de skeleton — fundo pulsante neutro. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

/**
 * Skeleton de tabela: cabeçalho + N linhas com células pulsantes. Espelha o
 * layout do EntityTable para evitar "salto" de layout quando os dados chegam.
 */
export function CrmTableSkeleton({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="border border-card-border rounded-xl overflow-hidden bg-card">
      <div className="border-b border-border/80 bg-muted/30 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-4 flex-1 ${c === 0 ? "max-w-[40%]" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton de grade de cards (board de oportunidades, listas em card). */
export function CrmCardGridSkeleton({
  cards = 6,
  columns = 4,
}: {
  cards?: number;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="surface-panel p-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton de página de detalhe: cabeçalho + blocos de conteúdo. */
export function CrmDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-1/2 max-w-md" />
        <Skeleton className="h-4 w-1/3 max-w-xs" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="surface-panel p-5 space-y-3">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
      <div className="surface-panel p-5 space-y-3">
        <Skeleton className="h-4 w-1/4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

export function CrmErrorState({
  error,
  label = "Não foi possível carregar os dados. Tente novamente.",
}: {
  error?: unknown;
  label?: string;
}) {
  const detail = error instanceof Error ? error.message : null;
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium text-red-600 dark:text-red-400">{label}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
