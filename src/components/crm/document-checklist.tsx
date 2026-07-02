import { useId, useState } from "react";
import { CheckSquare, Plus, Trash2, Square, CheckSquare as CheckSquareFilled } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";

interface DocumentChecklistProps {
  matterId: string;
}

const CATEGORY_OPTIONS = [
  { value: "contrato", label: "Contrato" },
  { value: "peticao", label: "Petição" },
  { value: "procuracao", label: "Procuração" },
  { value: "comprovante", label: "Comprovante" },
  { value: "certidao", label: "Certidão" },
  { value: "laudo", label: "Laudo" },
  { value: "parecer", label: "Parecer" },
  { value: "outro", label: "Outro" },
];

export function DocumentChecklist({ matterId }: DocumentChecklistProps) {
  const qc = useQueryClient();
  const labelId = useId();
  const categoryId = useId();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", category: "outro", required: true });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["document-checklist", matterId],
    queryFn: () => agroApi.listDocumentChecklist(matterId),
  });

  const addItem = useMutation({
    mutationFn: (data: typeof form) =>
      agroApi.createDocumentChecklistItem({ ...data, matterId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-checklist", matterId] });
      toast.success("Item adicionado!");
      setShowForm(false);
      setForm({ label: "", category: "outro", required: true });
    },
  });

  const toggleItem = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      agroApi.updateDocumentChecklistItem(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-checklist", matterId] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => agroApi.deleteDocumentChecklistItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-checklist", matterId] });
      toast.success("Item removido");
    },
  });

  const completedCount = items.filter((i) => i.status === "aprovado").length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Checklist de Documentos</h3>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} ({Math.round(progress)}%)
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          {showForm ? "Cancelar" : "Adicionar item"}
        </Button>
      </div>

      {totalCount > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItem.mutate(form);
          }}
          className="flex gap-2 items-end"
        >
          <div className="flex-1">
            <label htmlFor={labelId} className="text-xs text-muted-foreground">Documento necessário</label>
            <Input
              id={labelId}
              required
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Ex: Certidão de Regularidade do CAR"
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor={categoryId} className="text-xs text-muted-foreground">Categoria</label>
            <select
              id={categoryId}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm" disabled={addItem.isPending}>
            Adicionar
          </Button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border/80 rounded-xl p-6 text-center">
          <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum item no checklist</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/25 transition-colors group"
            >
              <button
                type="button"
                onClick={() =>
                  toggleItem.mutate({
                    id: item.id,
                    status: item.status === "aprovado" ? "pendente" : "aprovado",
                  })
                }
                className="shrink-0"
              >
                {item.status === "aprovado" ? (
                  <CheckSquareFilled className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              <span
                className={`text-sm flex-1 ${
                  item.status === "aprovado" ? "line-through text-muted-foreground" : ""
                }`}
              >
                {item.label}
              </span>
              {item.required && (
                <span className="text-xs text-orange-600 font-medium">Obrigatório</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteItem.mutate(item.id)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
