import { useRef, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KnowledgeDocumentForm } from "./knowledge-document-form";
import { KnowledgeDocumentList } from "./knowledge-document-list";
import { agroApi } from "@/lib/api/client";
import {
  useCreateKnowledgeDocument,
  useDeleteKnowledgeDocument,
  useUpdateKnowledgeDocument,
} from "@/hooks/use-knowledge";
import type {
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeDocumentInput,
} from "@shared/agro/types";

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

interface Props {
  categories: KnowledgeCategory[];
  documents: KnowledgeDocument[];
}

export type FormState = KnowledgeDocumentInput & { tagsText: string };

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
    tribunal: undefined,
    relator: undefined,
    dataJulgamento: undefined,
    numeroProcesso: undefined,
    ementa: undefined,
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
  const [reindexing, setReindexing] = useState(false);
  const [reindexMsg, setReindexMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleReindex() {
    setReindexing(true);
    setReindexMsg("Reindexando…");
    try {
      let seededTotal = 0;
      // Passadas orçadas no servidor; repete até cobrir todos os documentos.
      for (let pass = 0; pass < 50; pass++) {
        const p = await agroApi.reindexKnowledgeEmbeddings();
        if (p.skipped) {
          setReindexMsg("Sem provedor de embeddings configurado — nada a reindexar.");
          return;
        }
        seededTotal += p.seeded;
        if (p.done) {
          setReindexMsg(
            seededTotal > 0
              ? `Reindexação concluída: ${seededTotal} documento(s) atualizado(s).`
              : "Base já está totalmente indexada.",
          );
          return;
        }
        setReindexMsg(`Reindexando… ${seededTotal} pronto(s), ${p.remaining} restante(s).`);
      }
      setReindexMsg("Reindexação parcial — execute novamente para concluir.");
    } catch (e) {
      setReindexMsg(`Falha na reindexação: ${(e as Error).message}`);
    } finally {
      setReindexing(false);
    }
  }

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
      tribunal: doc.tribunal,
      relator: doc.relator,
      dataJulgamento: doc.dataJulgamento,
      numeroProcesso: doc.numeroProcesso,
      ementa: doc.ementa,
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
      tribunal: form.tribunal?.trim() || undefined,
      relator: form.relator?.trim() || undefined,
      dataJulgamento: form.dataJulgamento?.trim() || undefined,
      numeroProcesso: form.numeroProcesso?.trim() || undefined,
      ementa: form.ementa?.trim() || undefined,
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
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReindex}
              disabled={reindexing}
              title="Regerar os embeddings da busca semântica"
            >
              {reindexing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1.5" />
              )}
              Reindexar
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1.5" />
              Novo documento
            </Button>
          </div>
        )}
      </div>

      {reindexMsg && (
        <p className="text-[11px] text-muted-foreground">{reindexMsg}</p>
      )}

      {showForm && (
        <KnowledgeDocumentForm
          categories={categories}
          editingId={editingId}
          form={form}
          setForm={setForm}
          error={error}
          uploading={uploading}
          uploadMsg={uploadMsg}
          fileInputRef={fileInputRef}
          onFile={(file) => void handleFile(file)}
          onClearAttachment={clearAttachment}
          onClose={closeForm}
          onSubmit={handleSubmit}
          canSubmit={canSubmit}
          isPending={mutation.isPending}
        />
      )}

      <KnowledgeDocumentList
        documents={documents}
        categories={categories}
        onEdit={openEdit}
        onDelete={setPendingDelete}
      />

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
