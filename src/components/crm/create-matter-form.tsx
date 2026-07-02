import { useId, useState } from "react";
import { Plus, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import { useCreateMatter, useAllMatters } from "@/hooks/use-crm-queries";

export function CreateMatterForm({ opportunityId, onCreated }: { opportunityId?: string; onCreated?: () => void }) {
  const { user } = useAuth();
  const createMatter = useCreateMatter();
  const { data: allMatters } = useAllMatters();
  const titleId = useId();
  const clientNameId = useId();
  const cnjNumberId = useId();
  const courtId = useId();
  const opposingPartyId = useId();
  const phaseId = useId();
  const riskId = useId();
  const valueBrlId = useId();
  const ownerId = useId();
  const notesId = useId();
  const relationTypeId = useId();
  const parentMatterIdId = useId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    clientName: "",
    cnjNumber: "",
    court: "",
    opposingParty: "",
    phase: "",
    risk: "medio",
    valueBrl: "",
    owner: "",
    notes: "",
    parentMatterId: "",
    relationType: "",
  });

  const mattersList = allMatters?.items ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMatter.mutateAsync({
        title: form.title,
        clientName: form.clientName,
        cnjNumber: form.cnjNumber || undefined,
        court: form.court || undefined,
        opposingParty: form.opposingParty || undefined,
        phase: form.phase || undefined,
        risk: form.risk,
        valueBrl: form.valueBrl ? Number(form.valueBrl) : undefined,
        owner: form.owner || user?.name || "Equipe Agro",
        notes: form.notes,
        opportunityId,
        parentMatterId: form.parentMatterId || undefined,
        relationType: form.relationType || undefined,
      });
      toast.success("Demanda criada com sucesso!");
      setOpen(false);
      setForm({ title: "", clientName: "", cnjNumber: "", court: "", opposingParty: "", phase: "", risk: "medio", valueBrl: "", owner: "", notes: "", parentMatterId: "", relationType: "" });
      onCreated?.();
    } catch {
      toast.error("Erro ao criar demanda. Tente novamente.");
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Nova demanda
      </Button>
    );
  }

  return (
    <Card className="p-5 mb-6">
      <h2 className="text-sm font-semibold mb-4">Cadastrar demanda jurídica</h2>
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={titleId} className="text-xs text-muted-foreground">Título</label>
          <Input
            id={titleId}
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ação de cobrança"
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
          <label htmlFor={cnjNumberId} className="text-xs text-muted-foreground">Nº CNJ</label>
          <Input
            id={cnjNumberId}
            value={form.cnjNumber}
            onChange={(e) => setForm((f) => ({ ...f, cnjNumber: e.target.value }))}
            placeholder="0000000-00.0000.0.00.0000"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={courtId} className="text-xs text-muted-foreground">Vara / Fórum</label>
          <Input
            id={courtId}
            value={form.court}
            onChange={(e) => setForm((f) => ({ ...f, court: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={opposingPartyId} className="text-xs text-muted-foreground">Parte contrária</label>
          <Input
            id={opposingPartyId}
            value={form.opposingParty}
            onChange={(e) => setForm((f) => ({ ...f, opposingParty: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={phaseId} className="text-xs text-muted-foreground">Fase</label>
          <Input
            id={phaseId}
            value={form.phase}
            onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value }))}
            placeholder="Execução / Conhecimento"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={riskId} className="text-xs text-muted-foreground">Risco</label>
          <select
            id={riskId}
            value={form.risk}
            onChange={(e) => setForm((f) => ({ ...f, risk: e.target.value }))}
            className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="baixo">Baixo</option>
            <option value="medio">Médio</option>
            <option value="alto">Alto</option>
          </select>
        </div>
        <div>
          <label htmlFor={valueBrlId} className="text-xs text-muted-foreground">Valor da causa (R$)</label>
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

        <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Vincular a demanda existente (opcional)</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={relationTypeId} className="text-xs text-muted-foreground">Tipo de vínculo</label>
              <select
                id={relationTypeId}
                value={form.relationType}
                onChange={(e) => setForm((f) => ({ ...f, relationType: e.target.value }))}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Nenhum</option>
                <option value="apelacao">Apelação</option>
                <option value="recurso">Recurso</option>
                <option value="execucao">Execução</option>
                <option value="incidente">Incidente</option>
                <option value="correlacao">Correlação</option>
              </select>
            </div>
            {form.relationType && (
              <div>
                <label htmlFor={parentMatterIdId} className="text-xs text-muted-foreground">Demanda de origem</label>
                <select
                  id={parentMatterIdId}
                  value={form.parentMatterId}
                  onChange={(e) => setForm((f) => ({ ...f, parentMatterId: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">Selecionar demanda...</option>
                  {mattersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title || m.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={createMatter.isPending}>
            {createMatter.isPending ? "Salvando…" : "Criar demanda"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
