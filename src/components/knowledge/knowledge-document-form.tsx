import { useId, type RefObject } from "react";
import { Download, FileUp, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  KnowledgeCategory,
  KnowledgeDocStatus,
  KnowledgeDocType,
} from "@shared/agro/types";
import type { FormState } from "./knowledge-manager";

const TYPE_OPTIONS: Array<{ value: KnowledgeDocType; label: string }> = [
  { value: "guia", label: "Guia" },
  { value: "checklist", label: "Checklist" },
  { value: "nota_tecnica", label: "Nota técnica" },
  { value: "modelo", label: "Modelo" },
  { value: "faq", label: "FAQ" },
  { value: "jurisprudencia", label: "Jurisprudência" },
];

const STATUS_OPTIONS: Array<{ value: KnowledgeDocStatus; label: string }> = [
  { value: "publicado", label: "Publicado" },
  { value: "rascunho", label: "Rascunho" },
  { value: "em_revisao", label: "Em revisão" },
];

export const UPLOAD_ACCEPT =
  ".pdf,.docx,.md,.markdown,.txt,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv";

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  categories: KnowledgeCategory[];
  editingId: string | null;
  form: FormState;
  setForm: (updater: (f: FormState) => FormState) => void;
  error: string | null;
  uploading: boolean;
  uploadMsg: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onClearAttachment: () => void;
  onClose: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isPending: boolean;
}

export function KnowledgeDocumentForm({
  categories,
  editingId,
  form,
  setForm,
  error,
  uploading,
  uploadMsg,
  fileInputRef,
  onFile,
  onClearAttachment,
  onClose,
  onSubmit,
  canSubmit,
  isPending,
}: Props) {
  const titleId = useId();
  const summaryId = useId();
  const categoryId = useId();
  const typeId = useId();
  const statusId = useId();
  const tagsId = useId();
  const tribunalId = useId();
  const relatorId = useId();
  const numeroProcessoId = useId();
  const dataJulgamentoId = useId();
  const ementaId = useId();
  const attachmentId = useId();
  const bodyId = useId();

  return (
    <div className="surface-inset p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {editingId ? "Editar documento" : "Novo documento"}
        </p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={titleId} className="text-xs font-medium text-muted-foreground">
          Título
        </label>
        <Input
          id={titleId}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Título do documento"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={summaryId} className="text-xs font-medium text-muted-foreground">
          Resumo
        </label>
        <textarea
          id={summaryId}
          value={form.summary}
          onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
          placeholder="Resumo / conteúdo indexado pela busca semântica"
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label htmlFor={categoryId} className="text-xs font-medium text-muted-foreground">
            Categoria
          </label>
          <select
            id={categoryId}
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
          <label htmlFor={typeId} className="text-xs font-medium text-muted-foreground">
            Tipo
          </label>
          <select
            id={typeId}
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
          <label htmlFor={statusId} className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            id={statusId}
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
        <label htmlFor={tagsId} className="text-xs font-medium text-muted-foreground">
          Tags (separadas por vírgula)
        </label>
        <Input
          id={tagsId}
          value={form.tagsText}
          onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
          placeholder="ex.: cpr, garantias, registro"
        />
      </div>

      {form.type === "jurisprudencia" && (
        <div className="surface-inset p-3 space-y-3 border border-border/60 rounded-md">
          <p className="text-label-caps">Metadados da jurisprudência</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor={tribunalId} className="text-xs font-medium text-muted-foreground">
                Tribunal
              </label>
              <Input
                id={tribunalId}
                value={form.tribunal ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, tribunal: e.target.value }))}
                placeholder="ex.: STJ, TJ-MT"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={relatorId} className="text-xs font-medium text-muted-foreground">
                Relator(a)
              </label>
              <Input
                id={relatorId}
                value={form.relator ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, relator: e.target.value }))}
                placeholder="ex.: Min. Fulano de Tal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={numeroProcessoId}
                className="text-xs font-medium text-muted-foreground"
              >
                Nº do processo
              </label>
              <Input
                id={numeroProcessoId}
                value={form.numeroProcesso ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, numeroProcesso: e.target.value }))
                }
                placeholder="ex.: 0000000-00.0000.0.00.0000"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={dataJulgamentoId}
                className="text-xs font-medium text-muted-foreground"
              >
                Data do julgamento
              </label>
              <Input
                id={dataJulgamentoId}
                type="date"
                value={form.dataJulgamento ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dataJulgamento: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={ementaId} className="text-xs font-medium text-muted-foreground">
              Ementa
            </label>
            <textarea
              id={ementaId}
              value={form.ementa ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, ementa: e.target.value }))}
              placeholder="Ementa completa da decisão (indexada pela busca semântica)."
              rows={5}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y"
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor={attachmentId} className="text-xs font-medium text-muted-foreground">
          Anexo (PDF, Word .docx, Markdown, TXT, CSV)
        </label>
        <input
          id={attachmentId}
          ref={fileInputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
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
              onClick={onClearAttachment}
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
        <label htmlFor={bodyId} className="text-xs font-medium text-muted-foreground">
          Conteúdo (indexado pela busca semântica)
        </label>
        <textarea
          id={bodyId}
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
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button size="sm" onClick={onSubmit} disabled={!canSubmit}>
          {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
          {editingId ? "Salvar alterações" : "Criar documento"}
        </Button>
      </div>
    </div>
  );
}
