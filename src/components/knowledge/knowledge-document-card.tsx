import { Paperclip } from "lucide-react";
import type { KnowledgeDocument } from "@shared/agro/types";
import { getKnowledgeCategory } from "@shared/agro/knowledge";
import { KnowledgeStatusBadge } from "./knowledge-status-badge";
import { formatDate } from "@/lib/crm-labels";

const TYPE_LABELS: Record<KnowledgeDocument["type"], string> = {
  guia: "Guia",
  checklist: "Checklist",
  nota_tecnica: "Nota técnica",
  modelo: "Modelo",
  faq: "FAQ",
};

interface KnowledgeDocumentCardProps {
  document: KnowledgeDocument;
}

export function KnowledgeDocumentCard({ document }: KnowledgeDocumentCardProps) {
  const category = getKnowledgeCategory(document.categoryId);

  return (
    <article className="surface-panel p-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-caps">{category?.label ?? document.categoryId}</p>
          <h3 className="text-sm font-semibold leading-snug mt-2 text-foreground">
            {document.title}
          </h3>
        </div>
        <KnowledgeStatusBadge status={document.status} />
      </div>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed flex-1">
        {document.summary}
      </p>
      {document.fileUrl && (
        <a
          href={document.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
          title={document.fileName ?? "Baixar anexo"}
        >
          <Paperclip className="w-3 h-3" />
          <span className="truncate max-w-[14rem]">{document.fileName ?? "Anexo"}</span>
        </a>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border/60">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {TYPE_LABELS[document.type]}
        </span>
        <span className="text-[10px] text-muted-foreground">
          Atualizado {formatDate(document.updatedAt)}
        </span>
        {document.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-md border border-border/70 bg-muted/30 text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}