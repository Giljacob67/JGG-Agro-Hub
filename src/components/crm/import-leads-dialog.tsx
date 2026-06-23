import { useMemo, useRef, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeadLists, useImportLeads } from "@/hooks/use-crm-queries";
import { LIST_NONE } from "@/components/crm/lead-lists-bar";
import { IMPORT_LEAD_FIELDS } from "@shared/agro/lead-import";
import type { ImportLeadsResult } from "@shared/agro/lead-import";
import {
  parseSpreadsheet,
  guessMapping,
  buildImportRows,
  emptyMapping,
  type ParsedSheet,
  type ColumnMapping,
} from "@/lib/lead-import";

interface ImportLeadsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Lista pré-selecionada na barra (sugestão de destino). */
  defaultListId?: string | null;
}

const PREVIEW_LIMIT = 5;

export function ImportLeadsDialog({
  open,
  onClose,
  defaultListId,
}: ImportLeadsDialogProps) {
  const { data: lists = [] } = useLeadLists();
  const importLeads = useImportLeads();
  const fileInput = useRef<HTMLInputElement>(null);

  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping());
  const [targetList, setTargetList] = useState<string>(defaultListId ?? "");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ImportLeadsResult | null>(null);

  const builtRows = useMemo(
    () => (sheet ? buildImportRows(sheet, mapping) : []),
    [sheet, mapping],
  );
  const validRows = useMemo(
    () => builtRows.filter((r) => r.name && r.region),
    [builtRows],
  );
  const canImport =
    mapping.name >= 0 && mapping.region >= 0 && validRows.length > 0;

  if (!open) return null;

  function reset() {
    setSheet(null);
    setMapping(emptyMapping());
    setResult(null);
    setParsing(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setParsing(true);
    setResult(null);
    try {
      const parsed = await parseSpreadsheet(file);
      if (!parsed.headers.length || !parsed.rows.length) {
        toast.error("Planilha vazia ou sem cabeçalho.");
        setParsing(false);
        return;
      }
      setSheet(parsed);
      setMapping(guessMapping(parsed.headers));
    } catch {
      toast.error("Não foi possível ler o arquivo. Use CSV ou XLSX.");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!canImport) return;
    const listId = targetList && targetList !== LIST_NONE ? targetList : null;
    try {
      const res = await importLeads.mutateAsync({ leads: validRows, listId });
      setResult(res);
      if (res.imported > 0) {
        toast.success(`${res.imported} lead(s) importado(s).`);
      }
      if (res.failed > 0) {
        toast.warning(`${res.failed} linha(s) ignorada(s).`);
      }
    } catch {
      toast.error("Erro ao importar. Tente novamente.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <Card className="relative z-10 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-5 text-primary" />
            Importar leads (CSV / XLSX)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <ImportSummary result={result} onClose={handleClose} onReset={reset} />
          ) : !sheet ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Selecione um arquivo CSV ou XLSX. A primeira linha deve conter
                os nomes das colunas.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {parsing && (
                <p className="text-sm text-muted-foreground">Lendo arquivo…</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Mapeamento de colunas</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {sheet.rows.length} linha(s) detectada(s). Associe cada campo
                  a uma coluna da planilha.
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {IMPORT_LEAD_FIELDS.map(({ field, label, required }) => (
                    <label key={field} className="flex items-center gap-2 text-sm">
                      <span className="w-32 shrink-0 text-muted-foreground">
                        {label}
                        {required && <span className="text-red-600"> *</span>}
                      </span>
                      <select
                        value={mapping[field]}
                        onChange={(e) =>
                          setMapping((m) => ({
                            ...m,
                            [field]: Number(e.target.value),
                          }))
                        }
                        className="h-8 flex-1 min-w-0 rounded-md border border-border bg-background px-2 text-sm"
                        aria-label={`Coluna para ${label}`}
                      >
                        <option value={-1}>— ignorar —</option>
                        {sheet.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Coluna ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {(mapping.name < 0 || mapping.region < 0) && (
                  <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="size-3.5" />
                    Nome e Região são obrigatórios.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="import-list">
                  Atribuir à lista
                </label>
                <select
                  id="import-list"
                  value={targetList}
                  onChange={(e) => setTargetList(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">Sem lista</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {validRows.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">
                    Prévia ({validRows.length} lead(s) válido(s))
                  </p>
                  <div className="rounded-md border border-border overflow-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium">Nome</th>
                          <th className="px-2 py-1 text-left font-medium">Região</th>
                          <th className="px-2 py-1 text-left font-medium">Telefone</th>
                          <th className="px-2 py-1 text-left font-medium">E-mail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.slice(0, PREVIEW_LIMIT).map((r, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-2 py-1">{r.name}</td>
                            <td className="px-2 py-1">{r.region}</td>
                            <td className="px-2 py-1">{r.phone ?? "—"}</td>
                            <td className="px-2 py-1">{r.email ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={reset}>
                  Trocar arquivo
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={!canImport || importLeads.isPending}
                >
                  <Upload className="size-3.5 mr-1" />
                  {importLeads.isPending
                    ? "Importando…"
                    : `Importar ${validRows.length}`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImportSummary({
  result,
  onClose,
  onReset,
}: {
  result: ImportLeadsResult;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-5 text-green-600" />
        <span>
          <strong>{result.imported}</strong> lead(s) importado(s)
          {result.failed > 0 && (
            <>
              , <strong>{result.failed}</strong> ignorado(s)
            </>
          )}
          .
        </span>
      </div>
      {result.errors.length > 0 && (
        <div className="rounded-md border border-border max-h-40 overflow-auto text-xs">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Linha</th>
                <th className="px-2 py-1 text-left font-medium">Erro</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.slice(0, 20).map((e, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-2 py-1">{e.row}</td>
                  <td className="px-2 py-1">{e.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onReset}>
          Importar outro
        </Button>
        <Button size="sm" onClick={onClose}>
          Concluir
        </Button>
      </div>
    </div>
  );
}
