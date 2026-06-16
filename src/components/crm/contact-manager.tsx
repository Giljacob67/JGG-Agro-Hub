import { useState } from "react";
import { Users, Plus, Trash2, Phone, Mail, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";

interface ContactManagerProps {
  accountId: string;
}

const ROLE_LABELS: Record<string, string> = {
  proprietario: "Proprietário",
  administrador: "Administrador",
  gerente: "Gerente",
  advogado: "Advogado",
  contador: "Contador",
  parceiro: "Parceiro",
  outro: "Outro",
};

export function ContactManager({ accountId }: ContactManagerProps) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    cpf: "",
    role: "outro",
    department: "",
    isPrimary: false,
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", accountId],
    queryFn: () => agroApi.listContacts({ accountId }),
  });

  const createContact = useMutation({
    mutationFn: (data: typeof form) =>
      agroApi.createContact({ ...data, accountIds: [accountId] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts", accountId] });
      toast.success("Contato adicionado!");
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", whatsapp: "", cpf: "", role: "outro", department: "", isPrimary: false });
    },
    onError: () => toast.error("Erro ao adicionar contato"),
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => agroApi.deleteContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts", accountId] });
      toast.success("Contato removido");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Contatos</h3>
          <Badge variant="secondary">{contacts.length}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          {showForm ? "Cancelar" : "Adicionar contato"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createContact.mutate(form);
            }}
            className="grid sm:grid-cols-2 gap-3"
          >
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cargo/Papel</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">E-mail</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Telefone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(62) 99999-0000"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">WhatsApp</label>
              <Input
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">CPF</label>
              <Input
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={form.isPrimary}
                onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="isPrimary" className="text-xs text-muted-foreground">
                Contato principal
              </label>
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={createContact.isPending}>
                {createContact.isPending ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Carregando...</p>
      ) : contacts.length === 0 ? (
        <div className="border border-dashed border-border/80 rounded-xl p-6 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum contato cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact: any) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-muted/25 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium">
                    {contact.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    {contact.isPrimary && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[contact.role]}
                    {contact.department && ` · ${contact.department}`}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {contact.email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {contact.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteContact.mutate(contact.id)}
                className="h-7 w-7 p-0 text-destructive shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
