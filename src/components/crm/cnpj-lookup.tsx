import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLookupCnpj } from "@/hooks/use-crm-queries";
import { Search, Building2, MapPin, Phone, Mail } from "lucide-react";

function formatCnpj(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function cleanCnpj(v: string) {
  return v.replace(/\D/g, "");
}

function situacaoBadge(s: string) {
  const lower = s.toLowerCase();
  if (lower.includes("ativa") || lower.includes("aberta"))
    return "success" as const;
  if (lower.includes("baixa") || lower.includes("inativa"))
    return "danger" as const;
  return "warning" as const;
}

interface CnpjLookupProps {
  onFill?: (data: {
    name: string;
    contact?: string;
    region?: string;
    notes?: string;
  }) => void;
}

export function CnpjLookup({ onFill }: CnpjLookupProps) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useLookupCnpj(query, query.length >= 14);

  const handleSearch = () => {
    const cleaned = cleanCnpj(input);
    if (cleaned.length === 14) {
      setQuery(cleaned);
    }
  };

  const handleFill = () => {
    if (!data || !onFill) return;
    const region = [data.municipio, data.uf].filter(Boolean).join(", ");
    const notes = [
      data.razaoSocial && `Razão: ${data.razaoSocial}`,
      data.porte && `Porte: ${data.porte}`,
      data.naturezaJuridica && `Nat. Jurídica: ${data.naturezaJuridica}`,
      data.capitalSocial && `Capital: R$ ${data.capitalSocial.toLocaleString("pt-BR")}`,
      data.dataAbertura && `Abertura: ${data.dataAbertura}`,
      data.atividadePrincipal && `CNAE: ${data.atividadePrincipal}`,
    ]
      .filter(Boolean)
      .join("\n");

    onFill({
      name: data.nomeFantasia || data.razaoSocial,
      contact: [data.telefone, data.email].filter(Boolean).join(" / ") || undefined,
      region: region || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="size-4" />
          Consulta CNPJ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(formatCnpj(e.target.value))}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isLoading || cleanCnpj(input).length < 14}
          >
            <Search className="size-4" />
          </Button>
        </div>

        {error && (
          <p className="text-xs text-destructive">
            {error instanceof Error ? error.message : "Erro ao consultar CNPJ"}
          </p>
        )}

        {data && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{data.nomeFantasia || data.razaoSocial}</span>
              <Badge variant={situacaoBadge(data.situacao)}>{data.situacao}</Badge>
            </div>
            {data.nomeFantasia && data.nomeFantasia !== data.razaoSocial && (
              <p className="text-xs text-muted-foreground">{data.razaoSocial}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {data.endereco && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {data.endereco}, {data.bairro} - {data.municipio}/{data.uf}
                </span>
              )}
              {data.cep && <span>CEP: {data.cep}</span>}
              {(data.telefone || data.email) && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {data.telefone}
                  {data.email && (
                    <>
                      {" · "}
                      <Mail className="size-3" />
                      {data.email}
                    </>
                  )}
                </span>
              )}
              {data.capitalSocial && (
                <span>Capital: R$ {data.capitalSocial.toLocaleString("pt-BR")}</span>
              )}
              {data.dataAbertura && <span>Abertura: {data.dataAbertura}</span>}
              {data.atividadePrincipal && (
                <span className="col-span-2">CNAE: {data.atividadePrincipal}</span>
              )}
            </div>
            {onFill && (
              <Button size="sm" variant="outline" onClick={handleFill} className="mt-2">
                Preencher no Lead/Conta
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
