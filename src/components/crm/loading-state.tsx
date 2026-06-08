export function CrmLoadingState({ label = "Carregando dados…" }: { label?: string }) {
  return (
    <p className="text-sm text-muted-foreground py-8 text-center">{label}</p>
  );
}