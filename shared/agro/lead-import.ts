/** Campos de lead que podem ser preenchidos via importação CSV/XLSX. */
export type ImportLeadField =
  | "name"
  | "region"
  | "contact"
  | "phone"
  | "email"
  | "cnpj"
  | "cpf"
  | "address"
  | "crop"
  | "notes";

export interface ImportFieldDef {
  field: ImportLeadField;
  label: string;
  required: boolean;
}

/** Ordem de exibição no mapeamento de colunas. */
export const IMPORT_LEAD_FIELDS: ImportFieldDef[] = [
  { field: "name", label: "Nome / razão social", required: true },
  { field: "region", label: "Região", required: true },
  { field: "contact", label: "Contato", required: false },
  { field: "phone", label: "Telefone", required: false },
  { field: "email", label: "E-mail", required: false },
  { field: "cnpj", label: "CNPJ", required: false },
  { field: "cpf", label: "CPF", required: false },
  { field: "address", label: "Endereço", required: false },
  { field: "crop", label: "Cultura / operação", required: false },
  { field: "notes", label: "Notas", required: false },
];

export type ImportLeadRow = Partial<Record<ImportLeadField, string>>;

export interface ImportLeadsResult {
  imported: number;
  failed: number;
  errors: { row: number; error: string }[];
}
