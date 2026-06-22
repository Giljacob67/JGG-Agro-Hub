import { useState } from "react";
import { Receipt, Plus, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTaxObligations } from "@/hooks/use-crm-queries";
import { agroApi } from "@/lib/api/client";
import { formatCurrency } from "@/lib/crm-labels";

const TAX_TYPES: Record<string, string> = {
  itr: "ITR",
  itbi: "ITBI",
  ipva: "IPVA",
  outro: "Outro",
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "warning",
  pago: "success",
  atrasado: "danger",
  isento: "secondary",
};

export default function TaxObligationsPage() {
  usePageTitle("Rastreamento ITR/ITBI");
  const { data: taxes, isLoading } = useTaxObligations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    accountId: "",
    type: "itr",
    year: new Date().getFullYear().toString(),
    valueBrl: "",
    dueDate: "",
    status: "pendente",
    notes: "",
  });

  const taxesList = (taxes as any) || [];

  const stats = {
    total: taxesList.length,
    pendente: taxesList.filter((t: any) => t.status === "pendente").length,
    pago: taxesList.filter((t: any) => t.status === "pago").length,
    atrasado: taxesList.filter((t: any) => t.status === "atrasado").length,
    totalValue: taxesList.reduce((sum: number, t: any) => sum + (t.valueBrl || 0), 0),
    pendenteValue: taxesList.filter((t: any) => t.status === "pendente").reduce((sum: number, t: any) => sum + (t.valueBrl || 0), 0),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await agroApi.createTaxObligation({
        propertyId: form.propertyId,
        accountId: form.accountId,
        type: form.type,
        year: Number(form.year),
        valueBrl: Number(form.valueBrl),
        dueDate: form.dueDate,
        status: form.status,
        notes: form.notes || undefined,
      });
      toast.success("Obrigação tributária criada!");
      setOpen(false);
      setForm({ propertyId: "", accountId: "", type: "itr", year: new Date().getFullYear().toString(), valueBrl: "", dueDate: "", status: "pendente", notes: "" });
    } catch {
      toast.error("Erro ao criar obrigação.");
    }
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold">ITR / ITBI / IPVA</h1>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nova obrigação
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalValue)}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <p className="text-lg font-bold">{stats.pendente}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.pendenteValue)}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <p className="text-xs text-muted-foreground">Pagas</p>
            </div>
            <p className="text-lg font-bold">{stats.pago}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <p className="text-xs text-muted-foreground">Atrasadas</p>
            </div>
            <p className="text-lg font-bold">{stats.atrasado}</p>
          </Card>
        </div>

        {open && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4">Registrar obrigação tributária</h2>
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Tipo</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="itr">ITR</option>
                  <option value="itbi">ITBI</option>
                  <option value="ipva">IPVA</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ano</label>
                <Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} className="mt-1" />
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
                <label className="text-xs text-muted-foreground">Valor (R$)</label>
                <Input type="number" value={form.valueBrl} onChange={(e) => setForm((f) => ({ ...f, valueBrl: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data vencimento</label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="isento">Isento</option>
                </select>
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
        ) : taxesList.length === 0 ? (
          <Card className="p-8 text-center">
            <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhuma obrigação tributária registrada</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {taxesList.map((t: any) => (
              <Card key={t.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Badge variant={(STATUS_COLORS[t.status] as any) || "secondary"}>{TAX_TYPES[t.type] || t.type}</Badge>
                  <div>
                    <p className="text-sm font-medium">{t.propertyId || "Propriedade"}</p>
                    <p className="text-xs text-muted-foreground">Ano {t.year} · Vence {t.dueDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(t.valueBrl)}</p>
                  <Badge variant={(STATUS_COLORS[t.status] as any) || "secondary"} className="text-[10px]">{t.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
