import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KnowledgeCategory, KnowledgeDocument } from "@shared/agro/types";

interface Props {
  documents: KnowledgeDocument[];
  categories: KnowledgeCategory[];
  onEdit: (doc: KnowledgeDocument) => void;
  onDelete: (doc: KnowledgeDocument) => void;
}

export function KnowledgeDocumentList({ documents, categories, onEdit, onDelete }: Props) {
  return (
    <div className="divide-y divide-border/60">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{doc.title}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {categories.find((c) => c.id === doc.categoryId)?.label ?? doc.categoryId}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(doc)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(doc)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
