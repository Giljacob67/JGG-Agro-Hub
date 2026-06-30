import { useState } from "react";
import { MapPin, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agroApi } from "@/lib/api/client";
import type { Property } from "@shared/agro/types";

interface PropertyManagerProps {
  accountId: string;
}

const TYPE_LABELS: Record<string, string> = {
  propriedade: "Propriedade",
  posse: "Posse",
  area_de_interesse: "Área de Interesse",
};

export function PropertyManager({ accountId }: PropertyManagerProps) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "propriedade",
    carNumber: "",
    matricula: "",
    areaHa: "",
    declaredAreaHa: "",
    carAreaHa: "",
    matriculaAreaHa: "",
    municipality: "",
    state: "",
    mainCrop: "",
    location: "",
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", accountId],
    queryFn: () => agroApi.listProperties({ accountId }),
  });

  const createProperty = useMutation({
    mutationFn: (data: typeof form) =>
      agroApi.createProperty({
        ...data,
        areaHa: Number(data.areaHa) || 0,
        declaredAreaHa: Number(data.declaredAreaHa) || undefined,
        carAreaHa: Number(data.carAreaHa) || undefined,
        matriculaAreaHa: Number(data.matriculaAreaHa) || undefined,
        accountId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties", accountId] });
      toast.success("Propriedade cadastrada!");
      setShowForm(false);
      setForm({
        name: "", type: "propriedade", carNumber: "", matricula: "",
        areaHa: "", declaredAreaHa: "", carAreaHa: "", matriculaAreaHa: "",
        municipality: "", state: "", mainCrop: "", location: "",
      });
    },
    onError: () => toast.error("Erro ao cadastrar propriedade"),
  });

  const deleteProperty = useMutation({
    mutationFn: (id: string) => agroApi.deleteProperty(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties", accountId] });
      toast.success("Propriedade removida");
    },
  });

  const totalArea = properties.reduce((sum, p) => sum + (p.areaHa || 0), 0);

  function checkAreaMismatch(p: Property): boolean {
    if (!p.carAreaHa || !p.matriculaAreaHa) return false;
    return Math.abs(p.carAreaHa - p.matriculaAreaHa) > 1;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Propriedades Rurais</h3>
          <Badge variant="secondary">{properties.length}</Badge>
          {totalArea > 0 && (
            <Badge variant="secondary">{totalArea.toLocaleString("pt-BR")} ha</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          {showForm ? "Cancelar" : "Cadastrar propriedade"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createProperty.mutate(form);
            }}
            className="grid sm:grid-cols-2 gap-3"
          >
            <div>
              <label className="text-xs text-muted-foreground">Nome da propriedade</label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Fazenda São João"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nº CAR</label>
              <Input
                value={form.carNumber}
                onChange={(e) => setForm((f) => ({ ...f, carNumber: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Matrícula</label>
              <Input
                value={form.matricula}
                onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Área total (ha)</label>
              <Input
                type="number"
                required
                value={form.areaHa}
                onChange={(e) => setForm((f) => ({ ...f, areaHa: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Área CAR (ha)</label>
              <Input
                type="number"
                value={form.carAreaHa}
                onChange={(e) => setForm((f) => ({ ...f, carAreaHa: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Área Matrícula (ha)</label>
              <Input
                type="number"
                value={form.matriculaAreaHa}
                onChange={(e) => setForm((f) => ({ ...f, matriculaAreaHa: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Município</label>
              <Input
                value={form.municipality}
                onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">UF</label>
              <Input
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="GO"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cultura principal</label>
              <Input
                value={form.mainCrop}
                onChange={(e) => setForm((f) => ({ ...f, mainCrop: e.target.value }))}
                placeholder="Soja"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={createProperty.isPending}>
                {createProperty.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Carregando...</p>
      ) : properties.length === 0 ? (
        <div className="border border-dashed border-border/80 rounded-xl p-6 text-center">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma propriedade cadastrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {properties.map((prop) => (
            <div
              key={prop.id}
              className="p-3 border border-border/50 rounded-lg hover:bg-muted/25 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{prop.name}</p>
                      <Badge variant="secondary">{TYPE_LABELS[prop.type]}</Badge>
                      {checkAreaMismatch(prop) && (
                        <Badge variant="danger" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Área divergente
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {prop.areaHa?.toLocaleString("pt-BR")} ha
                      {prop.municipality && ` · ${prop.municipality}${prop.state ? `/${prop.state}` : ""}`}
                      {prop.mainCrop && ` · ${prop.mainCrop}`}
                    </p>
                    <div className="flex gap-4 mt-1">
                      {prop.carNumber && (
                        <span className="text-xs text-muted-foreground">CAR: {prop.carNumber}</span>
                      )}
                      {prop.matricula && (
                        <span className="text-xs text-muted-foreground">Mat: {prop.matricula}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteProperty.mutate(prop.id)}
                  className="h-7 w-7 p-0 text-destructive shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
