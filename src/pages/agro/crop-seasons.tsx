import { useState } from "react";
import { Sprout, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCropSeasons } from "@/hooks/use-crm-queries";
import { agroApi } from "@/lib/api/client";

export default function CropSeasonsPage() {
  usePageTitle("Safra Agrícola");
  const { data: seasons, isLoading } = useCropSeasons();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    year: new Date().getFullYear().toString(),
    mainCrop: "",
    region: "",
    plantingStart: "",
    plantingEnd: "",
    harvestStart: "",
    harvestEnd: "",
    notes: "",
  });

  const seasonsList = (seasons as any) || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await agroApi.createCropSeason({
        name: form.name,
        year: Number(form.year),
        mainCrop: form.mainCrop,
        region: form.region || undefined,
        plantingStart: form.plantingStart,
        plantingEnd: form.plantingEnd,
        harvestStart: form.harvestStart,
        harvestEnd: form.harvestEnd,
        notes: form.notes || undefined,
      });
      toast.success("Safra criada com sucesso!");
      setOpen(false);
      setForm({ name: "", year: new Date().getFullYear().toString(), mainCrop: "", region: "", plantingStart: "", plantingEnd: "", harvestStart: "", harvestEnd: "", notes: "" });
    } catch {
      toast.error("Erro ao criar safra.");
    }
  }

  const getCropEmoji = (crop: string) => {
    const c = crop.toLowerCase();
    if (c.includes("soja")) return "🫘";
    if (c.includes("milho")) return "🌽";
    if (c.includes("algod")) return "☁️";
    if (c.includes("trigo")) return "🌾";
    if (c.includes("cana")) return "🍯";
    if (c.includes("arroz")) return "🍚";
    return "🌱";
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sprout className="w-5 h-5 text-green-500" />
            <h1 className="text-2xl font-bold">Safra Agrícola</h1>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nova safra
          </Button>
        </div>

        {open && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4">Cadastrar safra</h2>
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Nome da safra</label>
                <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Safra 2025/26" className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ano</label>
                <Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cultura principal</label>
                <Input required value={form.mainCrop} onChange={(e) => setForm((f) => ({ ...f, mainCrop: e.target.value }))} placeholder="Soja, Milho, Algodão..." className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Região</label>
                <Input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} placeholder="MT, GO, MS..." className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Início plantio</label>
                <Input type="date" value={form.plantingStart} onChange={(e) => setForm((f) => ({ ...f, plantingStart: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fim plantio</label>
                <Input type="date" value={form.plantingEnd} onChange={(e) => setForm((f) => ({ ...f, plantingEnd: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Início colheita</label>
                <Input type="date" value={form.harvestStart} onChange={(e) => setForm((f) => ({ ...f, harvestStart: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fim colheita</label>
                <Input type="date" value={form.harvestEnd} onChange={(e) => setForm((f) => ({ ...f, harvestEnd: e.target.value }))} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground">Notas</label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1" />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm">Criar safra</Button>
              </div>
            </form>
          </Card>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : seasonsList.length === 0 ? (
          <Card className="p-8 text-center">
            <Sprout className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhuma safra cadastrada</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {seasonsList.map((s: any) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getCropEmoji(s.mainCrop)}</span>
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.mainCrop} · {s.region || "Brasil"}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Plantio: {s.plantingStart || "—"} a {s.plantingEnd || "—"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Colheita: {s.harvestStart || "—"} a {s.harvestEnd || "—"}
                  </div>
                </div>
                {s.notes && <p className="text-xs text-muted-foreground mt-2 truncate">{s.notes}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
