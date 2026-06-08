import { Badge } from "@/components/ui/badge";
import type { KnowledgeDocStatus } from "@shared/agro/types";

const LABELS: Record<KnowledgeDocStatus, string> = {
  publicado: "Publicado",
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
};

const VARIANTS: Record<
  KnowledgeDocStatus,
  "success" | "muted" | "warning"
> = {
  publicado: "success",
  rascunho: "muted",
  em_revisao: "warning",
};

interface KnowledgeStatusBadgeProps {
  status: KnowledgeDocStatus;
}

export function KnowledgeStatusBadge({ status }: KnowledgeStatusBadgeProps) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}