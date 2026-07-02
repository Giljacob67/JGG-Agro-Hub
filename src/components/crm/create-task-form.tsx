import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import { useCreateTask } from "@/hooks/use-crm-queries";

export function CreateTaskForm({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const createTask = useCreateTask();
  const titleId = useId();
  const descriptionId = useId();
  const priorityId = useId();
  const dueDateId = useId();
  const assigneeId = useId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "media",
    dueDate: "",
    assignee: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createTask.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        assignee: form.assignee || user?.name || "Equipe Agro",
      });
      toast.success("Tarefa criada com sucesso!");
      setOpen(false);
      setForm({ title: "", description: "", priority: "media", dueDate: "", assignee: "" });
      onCreated?.();
    } catch {
      toast.error("Erro ao criar tarefa. Tente novamente.");
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Nova tarefa
      </Button>
    );
  }

  return (
    <Card className="p-5 mb-6">
      <h2 className="text-sm font-semibold mb-4">Cadastrar tarefa</h2>
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor={titleId} className="text-xs text-muted-foreground">Título</label>
          <Input
            id={titleId}
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Revisar contrato"
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={descriptionId} className="text-xs text-muted-foreground">Descrição</label>
          <Input
            id={descriptionId}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={priorityId} className="text-xs text-muted-foreground">Prioridade</label>
          <select
            id={priorityId}
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div>
          <label htmlFor={dueDateId} className="text-xs text-muted-foreground">Prazo</label>
          <Input
            id={dueDateId}
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={assigneeId} className="text-xs text-muted-foreground">Responsável</label>
          <Input
            id={assigneeId}
            value={form.assignee}
            onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
            placeholder={user?.name || "Equipe Agro"}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={createTask.isPending}>
            {createTask.isPending ? "Salvando…" : "Criar tarefa"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
