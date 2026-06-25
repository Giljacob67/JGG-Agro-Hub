export function CrmLoadingState({ label = "Carregando dados…" }: { label?: string }) {
  return (
    <p className="text-sm text-muted-foreground py-8 text-center">{label}</p>
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
