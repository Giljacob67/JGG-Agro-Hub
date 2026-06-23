import { useRef, useState } from "react";
import {
  Download,
  FileUp,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { agroApi } from "@/lib/api/client";
import {
  useCreateKnowledgeDocument,
  useDeleteKnowledgeDocument,
  useUpdateKnowledgeDocument,
} from "@/hooks/use-knowledge";
import type {
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeDocStatus,
  KnowledgeDocType,
  KnowledgeDocumentInput,
} from "@shared/agro/types";

const TYPE_OPTIONS: Array<{ value: KnowledgeDocType; label: string }> = [
  { value: "guia", label: "Guia" },
  { value: "checklist", label: "Checklist" },
  { value: "nota_tecnica", label: "Nota técnica" },
  { value: "modelo", label: "Modelo" },
  { value: "faq", label: "FAQ" },
];

const STATUS_OPTIONS: Array<{ value: KnowledgeDocStatus; label: string }> = [
  { value: "publicado", label: "Publicado" },
  { value: "rascunho", label: "Rascunho" },
  { value: "em_revisao", label: "Em revisão" },
];

const UPLOAD_ACCEPT =
  ".pdf,.docx,.md,.markdown,.txt,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv";

/** Arquivo de texto puro: extraível no cliente sem ida ao servidor. */
function isTextualFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  return /\.(md|markdown|txt|csv)$/i.test(file.name);
}

/** Content-type efetivo (alguns navegadores não preenchem `.md`). */
function resolveContentType(file: File): string {
  if (file.type) return file.type;
  if (/\.md$|\.markdown$/i.test(file.name)) return "text/markdown";
  if (/\.txt$/i.test(file.name)) return "text/plain";
  if (/\.csv$/i.test(file.name)) return "text/csv";
  if (/\.pdf$/i.test(file.name)) return "application/pdf";
  if (/\.docx$/i.test(file.name))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  categories: KnowledgeCategory[];
  documents: KnowledgeDocument[];
}

type FormState = KnowledgeDocumentInput & { tagsText: string };

function emptyForm(categories: KnowledgeCategory[]): FormState {
  return {
    categoryId: categories[0]?.id ?? "",
    title: "",
    summary: "",
    tags: [],
    tagsText: "",
    type: "guia",
    status: "rascunho",
    body: "",
    fileUrl: undefined,
    fileName: undefined,
    fileSize: undefined,
    fileType: undefined,
  };
}

export function KnowledgeManager({ categories, documents }: Props) {
  const create = useCreateKnowledgeDocument();
  const update = useUpdateKnowledgeDocument();
  const remove = useDeleteKnowledgeDocument();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(categories));
  const [pendingDelete, setPendingDelete] = useState<KnowledgeDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = editingId ? update : create;
  const error = (mutation.error as Error | null)?.message ?? null;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(categories));
    setUploadMsg(null);
    setShowForm(true);
  }

  function openEdit(doc: KnowledgeDocument) {
    setEditingId(doc.id);
    setForm({
      categoryId: doc.categoryId,
      title: doc.title,
      summary: doc.summary,
      tags: doc.tags,
      tagsText: doc.tags.join(", "),
      type: doc.type,
      status: doc.status,
      body: doc.body ?? "",
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
    });
    setUploadMsg(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setUploadMsg(null);
    create.reset();
    update.reset();
  }

  async function handleFile(file: File) {
    setUploading(true);
    setUploadMsg(null);
    const contentType = resolveContentType(file);
    try {
      let fileUrl: string | undefined;
      // 1. Armazenamento em R2 (presign + PUT). Indisponível em dev/mock → segue só com metadados.
      try {
        const { uploadUrl, fileUrl: url } = await agroApi.presignKnowledgeUpload(
          file.name,
          contentType,
        );
        await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: file,
        });
        fileUrl = url;
      } catch {
        // storage não configurado — preview/dev
      }

      // 2. Extração de texto.
      let body: string | undefined;
      if (isTextualFile(file)) {
        body = await file.text();
      } else if (fileUrl) {
        try {
          const r = await agroApi.extractKnowledgeDocument(fileUrl, contentType, file.name);
          body = r.text;
          if (r.truncated) setUploadMsg("Conteúdo extraído (truncado no limite de tamanho).");
        } catch (e) {
          setUploadMsg(
            `Arquivo anexado, mas a extração falhou: ${(e as Error).message}. Você pode colar o conteúdo manualmente.`,
          );
        }
      } else {
        setUploadMsg(
          "Extração automática de PDF/DOCX requer storage configurado. Anexo salvo apenas como metadado nesta prévia.",
        );
      }

      setForm((f) => ({
        ...f,
        fileName: file.name,
        fileSize: file.size,
        fileType: contentType,
        fileUrl,
        ...(body !== undefined ? { body } : {}),
        ...(!f.title.trim() ? { title: file.name.replace(/\.[^.]+$/, "") } : {}),
      }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clearAttachment() {
    setForm((f) => ({
      ...f,
      fileName: undefined,
      fileSize: undefined,
      fileType: undefined,
      fileUrl: undefined,
    }));
    setUploadMsg(null);
  }

  function handleSubmit() {
    const tags = form.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const input: KnowledgeDocumentInput = {
      categoryId: form.categoryId,
      title: form.title.trim(),
      summary: form.summary.trim(),
      tags,
      type: form.type,
      status: form.status,
      body: form.body?.trim() ? form.body : undefined,
      fileUrl: form.fileUrl,
      fileName: form.fileName,
      fileSize: form.fileSize,
      fileType: form.fileType,
    };
    if (!input.title || !input.summary || !input.categoryId) return;

    if (editingId) {
      update.mutate({ id: editingId, input }, { onSuccess: closeForm });
    } else {
      create.mutate(input, { onSuccess: closeForm });
    }
  }

  const canSubmit =
    !!form.title.trim() &&
    !!form.summary.trim() &&
    !!form.categoryId &&
    !mutation.isPending &&
    !uploading;

  return (
    <div className="surface-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label-caps">Gerenciar base</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Criar, editar e remover documentos. As alterações reindexam a busca
            semântica automaticamente.
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            Novo documento
          </Button>
        )}
      </div>

      {showForm && (
        <div className="surface-inset p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {editingId ? "Editar documento" : "Novo documento"}
            </p>
            <Button variant="ghost" size="sm" onClick={closeForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Título</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Título do documento"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Resumo</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Resumo / conteúdo indexado pela busca semântica"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as KnowledgeDocType }))
                }
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as KnowledgeDocStatus }))
                }
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tags (separadas por vírgula)
            </label>
            <Input
              value={form.tagsText}
              onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
              placeholder="ex.: cpr, garantias, registro"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Anexo (PDF, Word .docx, Markdown, TXT, CSV)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            {form.fileName ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                <Paperclip className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{form.fileName}</span>
                {form.fileSize ? (
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {formatBytes(form.fileSize)}
                  </span>
                ) : null}
                {form.fileUrl && (
                  <a
                    href={form.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline shrink-0"
                    title="Baixar"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={clearAttachment}
                  className="text-muted-foreground hover:text-red-600 shrink-0"
                  title="Remover anexo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileUp className="w-3.5 h-3.5 mr-1.5" />
                )}
                {uploading ? "Processando…" : "Anexar arquivo"}
              </Button>
            )}
            {uploadMsg && <p className="text-[11px] text-amber-600">{uploadMsg}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Conteúdo (indexado pela busca semântica)
            </label>
            <textarea
              value={form.body ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Texto extraído do anexo ou colado manualmente. Indexado pelo Copilot."
              rows={8}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              {(form.body ?? "").length.toLocaleString("pt-BR")} caracteres
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closeForm}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
              {mutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              )}
              {editingId ? "Salvar alterações" : "Criar documento"}
            </Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border/60">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{doc.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {categories.find((c) => c.id === doc.categoryId)?.label ?? doc.categoryId}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEdit(doc)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPendingDelete(doc)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir documento"
        description={`Remover "${pendingDelete?.title ?? ""}" da base de conhecimento? O embedding correspondente também será removido.`}
        confirmLabel="Excluir"
        variant="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            remove.mutate(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
