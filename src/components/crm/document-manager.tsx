import { useState, useRef } from "react";
import { FileText, Upload, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";

interface DocumentManagerProps {
  entityType: "matter" | "account" | "opportunity" | "lead";
  entityId: string;
  matterId?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  contrato: "Contrato",
  peticao: "Petição",
  procuracao: "Procuração",
  comprovante: "Comprovante",
  certidao: "Certidão",
  laudo: "Laudo",
  parecer: "Parecer",
  decisao: "Decisão",
  despacho: "Despacho",
  notificacao: "Notificação",
  outro: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  recebido: "Recebido",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  arquivado: "Arquivado",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "danger" | "outline"> = {
  pendente: "outline",
  recebido: "secondary",
  aprovado: "default",
  rejeitado: "danger",
  arquivado: "secondary",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentManager({ entityType, entityId, matterId }: DocumentManagerProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "outro",
    description: "",
    dueDate: "",
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", entityType, entityId],
    queryFn: () => agroApi.listDocuments({ entityType, entityId, matterId }),
  });

  const createDoc = useMutation({
    mutationFn: async (data: typeof form & { fileUrl?: string; fileSize?: number; fileName?: string }) => {
      return agroApi.createDocument({
        ...data,
        entityType,
        entityId,
        matterId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      toast.success("Documento registrado!");
      setShowForm(false);
      setSelectedFile(null);
      setForm({ name: "", category: "outro", description: "", dueDate: "" });
    },
    onError: () => toast.error("Erro ao registrar documento"),
  });

  const deleteDoc = useMutation({
    mutationFn: (id: string) => agroApi.deleteDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      toast.success("Documento removido");
    },
  });

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!form.name) {
      setForm((f) => ({ ...f, name: file.name.replace(/\.[^.]+$/, "") }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);

    try {
      let fileUrl: string | undefined;
      let fileSize: number | undefined;
      let fileName: string | undefined;

      if (selectedFile) {
        // Try to upload to R2
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: selectedFile.name,
              contentType: selectedFile.type || "application/octet-stream",
              prefix: `${entityType}/${entityId}`,
            }),
          });

          if (res.ok) {
            const { uploadUrl, fileUrl: url } = await res.json();
            // Upload file to R2
            await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": selectedFile.type || "application/octet-stream" },
              body: selectedFile,
            });
            fileUrl = url;
            fileSize = selectedFile.size;
            fileName = selectedFile.name;
          } else {
            // R2 not configured, save metadata only
            console.warn("R2 not configured, saving metadata only");
            fileSize = selectedFile.size;
            fileName = selectedFile.name;
          }
        } catch {
          // R2 not available, save metadata only
          fileSize = selectedFile.size;
          fileName = selectedFile.name;
        }
      }

      await createDoc.mutateAsync({
        ...form,
        fileUrl,
        fileSize,
        fileName,
      });
    } catch {
      toast.error("Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  }

  const pendingCount = documents.filter((d) => d.status === "pendente").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Documentos</h3>
          <Badge variant="secondary">{documents.length}</Badge>
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-orange-600">
              {pendingCount} pendente(s)
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : (
            <>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Registrar documento
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Nome do documento</label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contrato de prestação de serviços"
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Arquivo</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  {selectedFile ? "Trocar arquivo" : "Selecionar arquivo"}
                </Button>
                {selectedFile && (
                  <span className="text-xs text-muted-foreground">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                PDF, Word, Excel, imagens — máx. 10 MB
              </p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Prazo</label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setSelectedFile(null); }}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={createDoc.isPending || uploading}>
                {uploading ? "Enviando..." : createDoc.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Carregando documentos...</p>
      ) : documents.length === 0 ? (
        <div className="border border-dashed border-border/80 rounded-xl p-6 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum documento registrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-muted/25 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[doc.category] || doc.category}
                    {doc.fileSize && ` · ${formatFileSize(doc.fileSize)}`}
                    {doc.dueDate && ` · Prazo: ${new Date(doc.dueDate).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={STATUS_COLORS[doc.status]}>
                  {STATUS_LABELS[doc.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">v{doc.version}</span>
                {doc.fileUrl && (
                  <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDoc.mutate(doc.id)}
                  className="h-7 w-7 p-0 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
