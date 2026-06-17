import { useState } from "react";
import { Landmark, Plus, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCreditInstruments } from "@/hooks/use-crm-queries";
import { agroApi } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format-utils";

const INSTRUMENT_TYPES: Record<string, string> = {
  cpr: "CPR",
  ccb: "CCB",
  penhor: "Penhor",
  alienacao_fiduciaria: "Alienação Fiduciária",
  contrato: "Contrato",
};

const STATUS_ICONS: Record<string, any> = {
  ativo: CheckCircle,
  vencido: AlertTriangle,
  quitado: CheckCircle,
  em_execucao: Clock,
};

const STATUS_COLORS: Record<string, string> = {
  ativo: "success",
  vencido: "danger",
  quitado: "secondary",
  em_execucao: "warning",
};

export default function CreditInstrumentsPage() {
  usePageTitle("Instrumentos de Crédito Rural");
  const { data: instruments, isLoading } = useCreditInstruments();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    accountId: "",
    matterId: "",
    type: "cpr",
    number: "",
    issuer: "",
    valueBrl: "",
    interestRate: "",
    issueDate: "",
    maturityDate: "",
    paymentMethod: "",
    installments: "",
    status: "ativo",
    notes: "",
  });

  const instrumentsList = (instruments as any) || [];
  const totalValue = instrumentsList.reduce((sum: number, i: any) => sum + (i.valueBrl || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await agroApi.createCreditInstrument({
        accountId: form.accountId,
        matterId: form.matterId || undefined,
        type: form.type,
        number: form.number,
        issuer: form.issuer || undefined,
        valueBrl: Number(form.valueBrl),
        interestRate: form.interestRate ? Number(form.interestRate) : undefined,
        issueDate: form.issueDate,
        maturityDate: form.maturityDate,
        paymentMethod: form.paymentMethod || undefined,
        installments: form.installments ? Number(form.installments) : undefined,
        status: form.status,
        notes: form.notes || undefined,
      });
      toast.success("Instrumento de crédito criado!");
      setOpen(false);
      setForm({ accountId: "", matterId: "", type: "cpr", number: "", issuer: "", valueBrl: "", interestRate: "", issueDate: "", maturityDate: "", paymentMethod: "", installments: "", status: "ativo", notes: "" });
    } catch {
      toast.error("Erro ao criar instrumento.");
    }
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Landmark className="w-5 h-5 text-blue-500" />
            <h1 className="text-2xl font-bold">Instrumentos de Crédito Rural</h1>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo instrumento
          </Button>
        </div>

        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Carteira total</p>
          <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-muted-foreground">{instrumentsList.length} instrumento(s)</p>
        </Card>

        {open && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4">Registrar instrumento de crédito</h2>
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Tipo</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="cpr">CPR</option>
                  <option value="ccb">CCB</option>
                  <option value="penhor">Penhor</option>
                  <option value="alienacao_fiduciaria">Alienação Fiduciária</option>
                  <option value="contrato">Contrato</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Número</label>
                <Input required value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Emissor</label>
                <Input value={form.issuer} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Valor (R$)</label>
                <Input type="number" required value={form.valueBrl} onChange={(e) => setForm((f) => ({ ...f, valueBrl: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Taxa de juros (% a.a.)</label>
                <Input type="number" step="0.01" value={form.interestRate} onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Parcelas</label>
                <Input type="number" value={form.installments} onChange={(e) => setForm((f) => ({ ...f, installments: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data emissão</label>
                <Input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data vencimento</label>
                <Input type="date" value={form.maturityDate} onChange={(e) => setForm((f) => ({ ...f, maturityDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Conta ID</label>
                <Input value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Demanda ID</label>
                <Input value={form.matterId} onChange={(e) => setForm((f) => ({ ...f, matterId: e.target.value }))} className="mt-1" />
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
        ) : instrumentsList.length === 0 ? (
          <Card className="p-8 text-center">
            <Landmark className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum instrumento de crédito registrado</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {instrumentsList.map((i: any) => {
              const Icon = STATUS_ICONS[i.status] || Clock;
              return (
                <Card key={i.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${(STATUS_COLORS[i.status] as any) === "success" ? "text-green-500" : (STATUS_COLORS[i.status] as any) === "danger" ? "text-red-500" : "text-amber-500"}`} />
                    <div>
                      <p className="text-sm font-medium">{INSTRUMENT_TYPES[i.type] || i.type} — {i.number}</p>
                      <p className="text-xs text-muted-foreground">Vence {i.maturityDate} {i.interestRate ? `· ${i.interestRate}% a.a.` : ""}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(i.valueBrl)}</p>
                    <Badge variant={(STATUS_COLORS[i.status] as any) || "secondary"} className="text-[10px]">{i.status}</Badge>
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
