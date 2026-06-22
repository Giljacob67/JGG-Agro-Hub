/**
 * Re-exports de formatação — canônica: crm-labels.ts
 * @deprecated Use `@/lib/crm-labels` diretamente.
 */
export { formatCurrency, formatHours, formatDate } from "./crm-labels";

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
