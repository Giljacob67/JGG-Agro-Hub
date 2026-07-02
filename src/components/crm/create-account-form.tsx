import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import { useCreateAccount } from "@/hooks/use-crm-queries";

export function CreateAccountForm({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const createAccount = useCreateAccount();
  const nameId = useId();
  const typeId = useId();
  const regionId = useId();
  const cropId = useId();
  const ownerId = useId();
  const notesId = useId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "Produtor" as string,
    region: "",
    crop: "",
    owner: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createAccount.mutateAsync({
        name: form.name,
        type: form.type,
        region: form.region,
        crop: form.crop,
        owner: form.owner || user?.name || "Equipe Agro",
        notes: form.notes,
      });
      toast.success("Conta criada com sucesso!");
      setOpen(false);
      setForm({ name: "", type: "Produtor", region: "", crop: "", owner: "", notes: "" });
      onCreated?.();
    } catch {
      toast.error("Erro ao criar conta. Tente novamente.");
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Nova conta
      </Button>
    );
  }

  return (
    <Card className="p-5 mb-6">
      <h2 className="text-sm font-semibold mb-4">Cadastrar conta</h2>
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={nameId} className="text-xs text-muted-foreground">Nome / razão social</label>
          <Input
            id={nameId}
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={typeId} className="text-xs text-muted-foreground">Tipo</label>
          <select
            id={typeId}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="Produtor">Produtor</option>
            <option value="Cooperativa">Cooperativa</option>
            <option value="Trajador">Trajador</option>
            <option value="Distribuidor">Distribuidor</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div>
          <label htmlFor={regionId} className="text-xs text-muted-foreground">Região</label>
          <Input
            id={regionId}
            required
            value={form.region}
            onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            placeholder="MT — Sorriso"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={cropId} className="text-xs text-muted-foreground">Cultura / operação</label>
          <Input
            id={cropId}
            value={form.crop}
            onChange={(e) => setForm((f) => ({ ...f, crop: e.target.value }))}
            placeholder="Soja / milho"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={ownerId} className="text-xs text-muted-foreground">Responsável</label>
          <Input
            id={ownerId}
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
            placeholder={user?.name || "Equipe Agro"}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={notesId} className="text-xs text-muted-foreground">Notas</label>
          <Input
            id={notesId}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={createAccount.isPending}>
            {createAccount.isPending ? "Salvando…" : "Criar conta"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
