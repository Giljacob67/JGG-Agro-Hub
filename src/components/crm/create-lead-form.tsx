import { useState } from "react";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import { useCreateLead } from "@/hooks/use-crm-queries";
import { ROUTES } from "@/lib/routes";

export function CreateLeadForm() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const createLead = useCreateLead();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    region: "",
    crop: "",
    source: "Manual",
    notes: "",
    nextContact: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lead = await createLead.mutateAsync({
      ...form,
      owner: user?.name ?? "Equipe Agro",
      nextContact: form.nextContact || null,
    });
    setOpen(false);
    setForm({
      name: "",
      contact: "",
      region: "",
      crop: "",
      source: "Manual",
      notes: "",
      nextContact: "",
    });
    navigate(ROUTES.crm.leadDetail(lead.id));
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Novo lead
      </Button>
    );
  }

  return (
    <Card className="p-5 mb-6">
      <h2 className="text-sm font-semibold mb-4">Cadastrar lead Agro</h2>
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lead-name" className="text-xs text-muted-foreground">
            Nome / razão social
          </label>
          <Input
            id="lead-name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="lead-contact" className="text-xs text-muted-foreground">
            Contato
          </label>
          <Input
            id="lead-contact"
            value={form.contact}
            onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="lead-region" className="text-xs text-muted-foreground">
            Região
          </label>
          <Input
            id="lead-region"
            required
            value={form.region}
            onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            placeholder="MT — Sorriso"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="lead-crop" className="text-xs text-muted-foreground">
            Cultura / operação
          </label>
          <Input
            id="lead-crop"
            value={form.crop}
            onChange={(e) => setForm((f) => ({ ...f, crop: e.target.value }))}
            placeholder="Soja / milho"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="lead-source" className="text-xs text-muted-foreground">
            Origem
          </label>
          <Input
            id="lead-source"
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="lead-next-contact" className="text-xs text-muted-foreground">
            Próximo contato
          </label>
          <Input
            id="lead-next-contact"
            type="date"
            value={form.nextContact}
            onChange={(e) => setForm((f) => ({ ...f, nextContact: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="lead-notes" className="text-xs text-muted-foreground">
            Notas
          </label>
          <Input
            id="lead-notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={createLead.isPending}>
            {createLead.isPending ? "Salvando…" : "Criar lead"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
