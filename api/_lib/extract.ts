/**
 * Text extraction for Knowledge Base document uploads.
 *
 * Suporta PDF (via unpdf/pdf.js — serverless-safe), DOCX (mammoth) e
 * texto puro (.md/.txt/.csv). Retorna texto plano normalizado para indexação
 * semântica (embeddings) e armazenamento como corpo do documento.
 *
 * `.doc` (Word legado, binário OLE) não é suportado — apenas `.docx`.
 */

/** Limite de caracteres do texto extraído para evitar payloads/embeddings gigantes. */
export const MAX_EXTRACTED_CHARS = 200_000;

const PDF_TYPES = new Set(["application/pdf"]);
const DOCX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

export interface ExtractResult {
  text: string;
  chars: number;
  truncated: boolean;
}

/** Normaliza whitespace e corta no limite. */
function finalize(raw: string): ExtractResult {
  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const truncated = text.length > MAX_EXTRACTED_CHARS;
  return {
    text: truncated ? text.slice(0, MAX_EXTRACTED_CHARS) : text,
    chars: Math.min(text.length, MAX_EXTRACTED_CHARS),
    truncated,
  };
}

function looksTextual(contentType: string, fileName?: string): boolean {
  if (TEXT_TYPES.has(contentType)) return true;
  if (contentType.startsWith("text/")) return true;
  if (fileName && /\.(md|markdown|txt|csv|json)$/i.test(fileName)) return true;
  return false;
}

/**
 * Extrai texto de um buffer conforme o content-type.
 * Lança `Error` com mensagem amigável quando o tipo não é suportado.
 */
export async function extractText(
  buffer: ArrayBuffer | Uint8Array,
  contentType: string,
  fileName?: string,
): Promise<ExtractResult> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (PDF_TYPES.has(contentType) || /\.pdf$/i.test(fileName ?? "")) {
    const { extractText: pdfExtract, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await pdfExtract(pdf, { mergePages: true });
    return finalize(Array.isArray(text) ? text.join("\n\n") : text);
  }

  if (DOCX_TYPES.has(contentType) || /\.docx$/i.test(fileName ?? "")) {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({
      buffer: Buffer.from(bytes),
    });
    return finalize(value);
  }

  if (looksTextual(contentType, fileName)) {
    return finalize(new TextDecoder("utf-8").decode(bytes));
  }

  throw new Error(
    `Tipo não suportado para extração: ${contentType || fileName || "desconhecido"}. Aceitos: PDF, DOCX, TXT, Markdown, CSV.`,
  );
}

/** Tipos de arquivo aceitos para extração de conteúdo na base de conhecimento. */
export const KB_EXTRACTABLE_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);
