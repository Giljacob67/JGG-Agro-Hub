import { useState } from "react";
import { FileText, Upload, Plus, Trash2, Clock, CheckCircle, AlertCircle } from "lucide-react";
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

export function DocumentManager({ entityType, entityId, matterId }: DocumentManagerProps) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
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
    mutationFn: (data: typeof form) =>
      agroApi.createDocument({
        ...data,
        entityType,
        entityId,
        matterId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      toast.success("Documento registrado!");
      setShowForm(false);
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

  const pendingCount = documents.filter((d: any) => d.status === "pendente").length;
  const approvedCount = documents.filter((d: any) => d.status === "aprovado").length;

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
          <Plus className="w-3.5 h-3.5 mr-1" />
          {showForm ? "Cancelar" : "Registrar documento"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createDoc.mutate(form);
            }}
            className="grid sm:grid-cols-2 gap-3"
          >
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
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={createDoc.isPending}>
                {createDoc.isPending ? "Salvando..." : "Registrar"}
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
          {documents.map((doc: any) => (
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
                    {doc.dueDate && ` · Prazo: ${new Date(doc.dueDate).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={STATUS_COLORS[doc.status]}>
                  {STATUS_LABELS[doc.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">v{doc.version}</span>
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
