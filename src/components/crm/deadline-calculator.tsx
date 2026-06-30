import { useState } from "react";
import { Calculator, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type DeadlineType,
  type DeadlineCalculation,
  PROCEDURAL_DEADLINES,
  calculateDeadline,
} from "../../../shared/agro/deadline-calculator";

interface DeadlineCalculatorProps {
  matterId?: string;
  onCalculate?: (result: DeadlineCalculation & { dueDate: string; daysRemaining: number }) => void;
}

const DEADLINE_OPTIONS = Object.entries(PROCEDURAL_DEADLINES)
  .filter(([key]) => key !== "custom")
  .map(([key, config]) => ({
    value: key as DeadlineType,
    label: config.label,
    days: config.businessDays,
    description: config.description,
  }));

export function DeadlineCalculator({ onCalculate }: DeadlineCalculatorProps) {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<DeadlineType>("contestacao");
  const [customDays, setCustomDays] = useState(10);
  const [result, setResult] = useState<(DeadlineCalculation & { dueDate: string; daysRemaining: number }) | null>(null);

  const handleCalculate = () => {
    const start = new Date(startDate);
    const r = calculateDeadline(start, type, type === "custom" ? customDays : undefined);
    setResult(r);
    onCalculate?.(r);
  };

  const urgencyColor = (days: number): "danger" | "warning" | "success" => {
    if (days <= 3) return "danger";
    if (days <= 7) return "warning";
    return "success";
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Calculadora de Prazos</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Data base</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tipo de prazo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DeadlineType)}
            className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
          >
            {DEADLINE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.days} dias)
              </option>
            ))}
            <option value="custom">Personalizado</option>
          </select>
        </div>

        {type === "custom" && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Dias úteis</label>
            <input
              type="number"
              min={1}
              max={365}
              value={customDays}
              onChange={(e) => setCustomDays(Number(e.target.value))}
              className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
            />
          </div>
        )}

        <Button onClick={handleCalculate} className="w-full" size="sm">
          <Calculator className="w-3.5 h-3.5 mr-1.5" />
          Calcular prazo
        </Button>

        {result && (
          <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Prazo</span>
              <Badge variant="secondary">{result.label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Dias úteis</span>
              <span className="text-sm font-mono">{result.businessDays}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Data de vencimento</span>
              <span className="text-sm font-semibold">{result.dueDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Dias restantes</span>
              <Badge variant={urgencyColor(result.daysRemaining)}>
                {result.daysRemaining === 0 ? (
                  <><AlertTriangle className="w-3 h-3 mr-1" /> Vencido</>
                ) : (
                  <><Clock className="w-3 h-3 mr-1" /> {result.daysRemaining} dias</>
                )}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t border-border">
              {result.description}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
