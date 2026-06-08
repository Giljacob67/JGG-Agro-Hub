import type { KnowledgeCategory, KnowledgeDocument } from "@shared/agro/types";
import { cn } from "@/lib/utils";

interface KnowledgeCategoryCardProps {
  category: KnowledgeCategory;
  documents: KnowledgeDocument[];
  active?: boolean;
  onSelect: (categoryId: string) => void;
}

export function KnowledgeCategoryCard({
  category,
  documents,
  active,
  onSelect,
}: KnowledgeCategoryCardProps) {
  const published = documents.filter((d) => d.status === "publicado").length;

  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      className={cn(
        "surface-panel p-5 text-left h-full transition-colors",
        active
          ? "border-primary/30 bg-primary/[0.04]"
          : "hover:border-primary/20",
      )}
    >
      <p className="text-label-caps">Categoria</p>
      <h3 className="text-sm font-semibold mt-2 leading-snug">{category.label}</h3>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        {category.description}
      </p>
      <p className="text-[11px] text-muted-foreground mt-4 tabular-nums">
        {published} publicado{published !== 1 ? "s" : ""} · {documents.length} total
      </p>
    </button>
  );
}