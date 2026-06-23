import type {
  ImportLeadField,
  ImportLeadRow,
} from "@shared/agro/lead-import";

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

/** Mapeamento coluna→campo. Valor é o índice da coluna na planilha, ou -1. */
export type ColumnMapping = Record<ImportLeadField, number>;

const MAX_ROWS = 2000;

/** Lê CSV/XLSX no browser (xlsx carregado sob demanda). */
export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const XLSX = await import("xlsx");
  const isCsv =
    /\.csv$/i.test(file.name) || file.type === "text/csv";
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: "string" })
    : XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[firstSheet];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });
  if (!matrix.length) return { headers: [], rows: [] };
  const headers = (matrix[0] ?? []).map((h) => String(h ?? "").trim());
  const rows = matrix
    .slice(1)
    .map((r) => headers.map((_, i) => String(r[i] ?? "").trim()))
    .filter((r) => r.some((cell) => cell !== ""))
    .slice(0, MAX_ROWS);
  return { headers, rows };
}

const HEADER_HINTS: { field: ImportLeadField; patterns: RegExp[] }[] = [
  { field: "name", patterns: [/raz[ãa]o/i, /\bnome\b/i, /fantasia/i] },
  { field: "cnpj", patterns: [/c\.?g\.?c/i, /cnpj/i] },
  { field: "cpf", patterns: [/c\.?p\.?f/i] },
  { field: "email", patterns: [/mail/i] },
  { field: "phone", patterns: [/celular/i, /\bfone\b/i, /telefone/i] },
  { field: "address", patterns: [/endere/i, /logradouro/i] },
  { field: "region", patterns: [/munic[íi]pio/i, /cidade/i, /\bregi[ãa]o\b/i] },
  { field: "crop", patterns: [/cultura/i, /opera/i] },
  { field: "contact", patterns: [/contato/i, /respons/i] },
  { field: "notes", patterns: [/observa/i, /\bnota/i] },
];

export function emptyMapping(): ColumnMapping {
  return {
    name: -1, region: -1, contact: -1, phone: -1, email: -1,
    cnpj: -1, cpf: -1, address: -1, crop: -1, notes: -1,
  };
}

/** Adivinha o mapeamento a partir dos nomes das colunas. */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping = emptyMapping();
  for (const { field, patterns } of HEADER_HINTS) {
    const idx = headers.findIndex((h) => patterns.some((p) => p.test(h)));
    if (idx >= 0) mapping[field] = idx;
  }
  return mapping;
}

/** Constrói as linhas de lead a partir do mapeamento de colunas. */
export function buildImportRows(
  sheet: ParsedSheet,
  mapping: ColumnMapping,
): ImportLeadRow[] {
  const fields = Object.keys(mapping) as ImportLeadField[];
  return sheet.rows.map((row) => {
    const lead: ImportLeadRow = {};
    for (const field of fields) {
      const col = mapping[field];
      if (col < 0) continue;
      const value = (row[col] ?? "").trim();
      if (value) lead[field] = value;
    }
    return lead;
  });
}
