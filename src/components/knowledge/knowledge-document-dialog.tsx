import { useId } from "react";
import { Paperclip, X } from "lucide-react";
import type { KnowledgeDocument } from "@shared/agro/types";
import { getKnowledgeCategory } from "@shared/agro/knowledge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { KnowledgeStatusBadge } from "./knowledge-status-badge";
import { formatDate } from "@/lib/crm-labels";

const TYPE_LABELS: Record<KnowledgeDocument["type"], string> = {
  guia: "Guia",
  checklist: "Checklist",
  nota_tecnica: "Nota técnica",
  modelo: "Modelo",
  faq: "FAQ",
  jurisprudencia: "Jurisprudência",
};

interface KnowledgeDocumentDialogProps {
  document: KnowledgeDocument | null;
  onClose: () => void;
}

export function KnowledgeDocumentDialog({
  document,
  onClose,
}: KnowledgeDocumentDialogProps) {
  const titleId = useId();

  if (!document) return null;

  const category = getKnowledgeCategory(document.categoryId);

  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy={titleId}
      containerClassName="items-start overflow-y-auto py-10"
      panelClassName="max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col"
    >
      <Card className="shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border/60">
          <div className="min-w-0">
            <p className="text-label-caps text-primary/80">
              {category?.label ?? document.categoryId}
            </p>
            <h2 id={titleId} className="text-lg font-semibold leading-snug mt-1.5">
              {document.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <KnowledgeStatusBadge status={document.status} />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {TYPE_LABELS[document.type]}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Atualizado {formatDate(document.updatedAt)}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {document.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {document.summary}
            </p>
          )}

          {(document.tribunal ||
            document.relator ||
            document.numeroProcesso ||
            document.dataJulgamento) && (
            <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border/60 bg-muted/20 p-3 text-xs">
              {document.tribunal && (
                <div>
                  <dt className="text-muted-foreground">Tribunal</dt>
                  <dd className="font-medium">{document.tribunal}</dd>
                </div>
              )}
              {document.relator && (
                <div>
                  <dt className="text-muted-foreground">Relator(a)</dt>
                  <dd className="font-medium">{document.relator}</dd>
                </div>
              )}
              {document.numeroProcesso && (
                <div>
                  <dt className="text-muted-foreground">Nº do processo</dt>
                  <dd className="font-medium">{document.numeroProcesso}</dd>
                </div>
              )}
              {document.dataJulgamento && (
                <div>
                  <dt className="text-muted-foreground">Data do julgamento</dt>
                  <dd className="font-medium">{formatDate(document.dataJulgamento)}</dd>
                </div>
              )}
            </dl>
          )}

          {document.ementa && (
            <div className="space-y-1.5">
              <p className="text-label-caps">Ementa</p>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {document.ementa}
              </div>
            </div>
          )}

          {document.body ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {document.body}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Documento sem corpo de texto indexado.
            </p>
          )}

          {document.fileUrl && (
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
              title={document.fileName ?? "Baixar anexo"}
            >
              <Paperclip className="w-3 h-3" />
              <span className="truncate max-w-[18rem]">
                {document.fileName ?? "Anexo"}
              </span>
            </a>
          )}

          {document.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
              {document.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-border/70 bg-muted/30 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Dialog>
  );
}
