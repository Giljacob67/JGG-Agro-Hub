import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import { useCreateOpportunity } from "@/hooks/use-crm-queries";

export function CreateOpportunityForm({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const createOpp = useCreateOpportunity();
  const titleId = useId();
  const clientNameId = useId();
  const regionId = useId();
  const cropId = useId();
  const valueBrlId = useId();
  const ownerId = useId();
  const notesId = useId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    clientName: "",
    region: "",
    crop: "",
    valueBrl: "",
    owner: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createOpp.mutateAsync({
        title: form.title,
        clientName: form.clientName,
        region: form.region,
        crop: form.crop,
        valueBrl: form.valueBrl ? Number(form.valueBrl) : undefined,
        owner: form.owner || user?.name || "Equipe Agro",
        notes: form.notes,
      });
      toast.success("Oportunidade criada com sucesso!");
      setOpen(false);
      setForm({ title: "", clientName: "", region: "", crop: "", valueBrl: "", owner: "", notes: "" });
      onCreated?.();
    } catch {
      toast.error("Erro ao criar oportunidade. Tente novamente.");
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Nova oportunidade
      </Button>
    );
  }

  return (
    <Card className="p-5 mb-6">
      <h2 className="text-sm font-semibold mb-4">Cadastrar oportunidade</h2>
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={titleId} className="text-xs text-muted-foreground">Título</label>
          <Input
            id={titleId}
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Compra de insumos 2026"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={clientNameId} className="text-xs text-muted-foreground">Cliente</label>
          <Input
            id={clientNameId}
            required
            value={form.clientName}
            onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={regionId} className="text-xs text-muted-foreground">Região</label>
          <Input
            id={regionId}
            value={form.region}
            onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            placeholder="MT — Sorriso"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={cropId} className="text-xs text-muted-foreground">Cultura</label>
          <Input
            id={cropId}
            value={form.crop}
            onChange={(e) => setForm((f) => ({ ...f, crop: e.target.value }))}
            placeholder="Soja / milho"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={valueBrlId} className="text-xs text-muted-foreground">Valor (R$)</label>
          <Input
            id={valueBrlId}
            type="number"
            value={form.valueBrl}
            onChange={(e) => setForm((f) => ({ ...f, valueBrl: e.target.value }))}
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
          <Button type="submit" size="sm" disabled={createOpp.isPending}>
            {createOpp.isPending ? "Salvando…" : "Criar oportunidade"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
