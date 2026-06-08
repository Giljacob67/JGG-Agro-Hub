import { useMemo, useState } from "react";
import { Library } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { KnowledgeCategoryCard } from "@/components/knowledge/knowledge-category-card";
import { KnowledgeDocumentCard } from "@/components/knowledge/knowledge-document-card";
import { CrmLoadingState } from "@/components/crm/loading-state";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/use-page-title";
import { useKnowledge } from "@/hooks/use-knowledge";
import { COPILOT_KNOWLEDGE_NOTICE } from "@shared/agro/copilot";

export default function KnowledgePage() {
  usePageTitle("Base de Conhecimento Agro");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useKnowledge(categoryId);

  const documents = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.documents;
    return data.documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const docsByCategory = useMemo(() => {
    const map = new Map<string, typeof documents>();
    if (!data) return map;
    for (const cat of data.categories) {
      map.set(
        cat.id,
        data.documents.filter((d) => d.categoryId === cat.id),
      );
    }
    return map;
  }, [data]);

  if (isLoading || !data) {
    return (
      <AppShell>
        <CrmLoadingState label="Carregando Base de Conhecimento…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[88rem] mx-auto space-y-8">
        <header className="command-hero p-6 md:p-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl border border-primary/20 bg-primary/8 flex items-center justify-center shrink-0">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <div className="max-w-3xl">
              <p className="text-label-caps text-primary/80">IA Agro</p>
              <h1 className="text-2xl font-semibold tracking-tight mt-1">
                Base de Conhecimento Agro
              </h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Conteúdos estruturados por área jurídica e comercial do agronegócio —
                guias, checklists, notas técnicas, modelos e FAQs internos.
              </p>
              <p className="text-xs text-muted-foreground mt-4 border-l-2 border-accent/40 pl-3 leading-relaxed">
                {COPILOT_KNOWLEDGE_NOTICE}
              </p>
            </div>
          </div>
        </header>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <p className="text-label-caps">Categorias</p>
              <h2 className="text-lg font-semibold tracking-tight mt-1">
                Áreas de conhecimento
              </h2>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, resumo ou tag…"
              className="max-w-sm"
              aria-label="Buscar documentos"
            />
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setCategoryId(undefined)}
              className={`surface-panel p-4 text-left transition-colors ${
                !categoryId ? "border-primary/30 bg-primary/[0.04]" : "hover:border-primary/20"
              }`}
            >
              <p className="text-xs font-semibold">Todas as categorias</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {data.documents.length} documentos
              </p>
            </button>
            {data.categories.map((category) => (
              <KnowledgeCategoryCard
                key={category.id}
                category={category}
                documents={docsByCategory.get(category.id) ?? []}
                active={categoryId === category.id}
                onSelect={setCategoryId}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-label-caps">Biblioteca</p>
            <h2 className="text-lg font-semibold tracking-tight mt-1">
              {categoryId
                ? data.categories.find((c) => c.id === categoryId)?.label
                : "Todos os documentos"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {documents.length}{" "}
              {documents.length === 1 ? "documento encontrado" : "documentos encontrados"}
            </p>
          </div>

          {documents.length === 0 ? (
            <div className="surface-panel p-10 text-center border-dashed">
              <p className="text-sm text-muted-foreground">
                Nenhum documento encontrado com os filtros atuais.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <KnowledgeDocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}