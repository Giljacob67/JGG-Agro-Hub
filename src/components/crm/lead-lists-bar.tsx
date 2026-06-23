import { useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useLeadLists,
  useCreateLeadList,
  useDeleteLeadList,
} from "@/hooks/use-crm-queries";

export const LIST_ALL = "all";
export const LIST_NONE = "none";

interface LeadListsBarProps {
  value: string;
  onChange: (listId: string) => void;
}

export function LeadListsBar({ value, onChange }: LeadListsBarProps) {
  const { data: lists = [] } = useLeadLists();
  const createList = useCreateLeadList();
  const deleteList = useDeleteLeadList();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const list = await createList.mutateAsync({ name: trimmed });
      toast.success(`Lista "${list.name}" criada.`);
      setName("");
      setCreating(false);
      onChange(list.id);
    } catch {
      toast.error("Erro ao criar lista. Tente novamente.");
    }
  }

  async function handleDelete(id: string) {
    setPendingDelete(null);
    try {
      await deleteList.mutateAsync(id);
      toast.success("Lista removida. Os leads foram mantidos sem lista.");
      if (value === id) onChange(LIST_ALL);
    } catch {
      toast.error("Erro ao remover lista.");
    }
  }

  const deleteTarget = lists.find((l) => l.id === pendingDelete);

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill active={value === LIST_ALL} onClick={() => onChange(LIST_ALL)}>
          Todas
        </Pill>
        <Pill active={value === LIST_NONE} onClick={() => onChange(LIST_NONE)}>
          Sem lista
        </Pill>
        {lists.map((list) => (
          <div key={list.id} className="flex items-center">
            <Pill active={value === list.id} onClick={() => onChange(list.id)}>
              {list.name}
              {typeof list.leadCount === "number" && (
                <span className="ml-1.5 text-xs opacity-70">
                  {list.leadCount}
                </span>
              )}
            </Pill>
            {value === list.id && (
              <button
                type="button"
                aria-label={`Remover lista ${list.name}`}
                className="ml-1 text-muted-foreground hover:text-red-600"
                onClick={() => setPendingDelete(list.id)}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}

        {creating ? (
          <form onSubmit={handleCreate} className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da lista"
              className="h-8 w-44"
            />
            <Button type="submit" size="sm" disabled={createList.isPending}>
              Criar
            </Button>
            <button
              type="button"
              aria-label="Cancelar"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setCreating(false);
                setName("");
              }}
            >
              <X className="size-4" />
            </button>
          </form>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-3.5" /> Nova lista
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remover lista"
        description={
          deleteTarget
            ? `Remover a lista "${deleteTarget.name}"? Os leads serão mantidos, apenas desvinculados da lista.`
            : ""
        }
        confirmLabel="Remover"
        variant="danger"
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-sm transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted")
      }
    >
      {children}
    </button>
  );
}
