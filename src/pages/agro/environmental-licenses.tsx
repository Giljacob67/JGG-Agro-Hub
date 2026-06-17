import { useState } from "react";
import { Leaf, Plus, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/use-page-title";
import { useEnvironmentalLicenses } from "@/hooks/use-crm-queries";
import { agroApi } from "@/lib/api/client";

const STATUS_ICONS: Record<string, any> = {
  vigente: CheckCircle,
  em_renovacao: Clock,
  vencida: AlertTriangle,
  suspensa: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  vigente: "success",
  em_renovacao: "warning",
  vencida: "danger",
  suspensa: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  vigente: "Vigente",
  em_renovacao: "Em renovação",
  vencida: "Vencida",
  suspensa: "Suspensa",
};

export default function EnvironmentalLicensesPage() {
  usePageTitle("Licenças Ambientais");
  const { data: licenses, isLoading } = useEnvironmentalLicenses();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    accountId: "",
    type: "",
    number: "",
    issuer: "",
    issuedAt: "",
    expiresAt: "",
    status: "vigente",
    notes: "",
  });

  const licensesList = (licenses as any) || [];

  const stats = {
    total: licensesList.length,
    vigente: licensesList.filter((l: any) => l.status === "vigente").length,
    em_renovacao: licensesList.filter((l: any) => l.status === "em_renovacao").length,
    vencida: licensesList.filter((l: any) => l.status === "vencida").length,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await agroApi.createEnvironmentalLicense({
        propertyId: form.propertyId,
        accountId: form.accountId,
        type: form.type,
        number: form.number,
        issuer: form.issuer,
        issuedAt: form.issuedAt,
        expiresAt: form.expiresAt,
        status: form.status,
        notes: form.notes || undefined,
      });
      toast.success("Licença ambiental criada!");
      setOpen(false);
      setForm({ propertyId: "", accountId: "", type: "", number: "", issuer: "", issuedAt: "", expiresAt: "", status: "vigente", notes: "" });
    } catch {
      toast.error("Erro ao criar licença.");
    }
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="w-5 h-5 text-green-500" />
            <h1 className="text-2xl font-bold">Licenças Ambientais</h1>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nova licença
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{stats.total}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <p className="text-xs text-muted-foreground">Vigentes</p>
            </div>
            <p className="text-lg font-bold">{stats.vigente}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <p className="text-xs text-muted-foreground">Em renovação</p>
            </div>
            <p className="text-lg font-bold">{stats.em_renovacao}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <p className="text-xs text-muted-foreground">Vencidas</p>
            </div>
            <p className="text-lg font-bold">{stats.vencida}</p>
          </Card>
        </div>

        {open && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4">Registrar licença ambiental</h2>
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Tipo de licença</label>
                <Input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="LP, LI, LO..." className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Número</label>
                <Input required value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Órgão emissor</label>
                <Input value={form.issuer} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))} placeholder="IBAMA, SEMA..." className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="vigente">Vigente</option>
                  <option value="em_renovacao">Em renovação</option>
                  <option value="vencida">Vencida</option>
                  <option value="suspensa">Suspensa</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Propriedade ID</label>
                <Input value={form.propertyId} onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Conta ID</label>
                <Input value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data emissão</label>
                <Input type="date" value={form.issuedAt} onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data validade</label>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground">Notas</label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1" />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm">Criar</Button>
              </div>
            </form>
          </Card>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : licensesList.length === 0 ? (
          <Card className="p-8 text-center">
            <Leaf className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhuma licença ambiental registrada</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {licensesList.map((l: any) => {
              const Icon = STATUS_ICONS[l.status] || Clock;
              return (
                <Card key={l.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${(STATUS_COLORS[l.status] as any) === "success" ? "text-green-500" : (STATUS_COLORS[l.status] as any) === "danger" ? "text-red-500" : "text-amber-500"}`} />
                    <div>
                      <p className="text-sm font-medium">{l.type} — {l.number}</p>
                      <p className="text-xs text-muted-foreground">{l.issuer || "Órgão não informado"} · Válido até {l.expiresAt}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={(STATUS_COLORS[l.status] as any) || "secondary"}>{STATUS_LABELS[l.status] || l.status}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
