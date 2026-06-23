import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, requireCsrf, applyCors } from "./_lib/http.js";
import { getPresignedUploadUrl, generateFileKey, isR2Configured } from "./_lib/r2.js";
import { extractText, KB_EXTRACTABLE_CONTENT_TYPES } from "./_lib/extract.js";

/** Limite de bytes baixados do R2 para extração (proteção de memória serverless). */
const MAX_EXTRACT_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/csv",
  "text/plain",
  "text/markdown",
  "application/zip",
]);

const MAX_FILE_NAME_LENGTH = 255;
const MAX_PREFIX_LENGTH = 100;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = requireAuth(req, res, "matters");
  if (!user) return;

  if (!requireCsrf(req, res)) return;

  // ── Operação: extração de texto (Base de Conhecimento, Nível 2) ──────
  if ((req.body as { op?: string })?.op === "extract") {
    return handleExtract(req, res, user);
  }

  if (!isR2Configured()) {
    return res.status(503).json({
      error: "Storage não configurado. Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.",
    });
  }

  try {
    const { fileName, contentType, prefix } = req.body as {
      fileName?: string;
      contentType?: string;
      prefix?: string;
    };

    if (!fileName || !contentType) {
      return res.status(400).json({ error: "fileName e contentType são obrigatórios" });
    }

    if (fileName.length > MAX_FILE_NAME_LENGTH) {
      return res.status(400).json({ error: `fileName excede ${MAX_FILE_NAME_LENGTH} caracteres` });
    }

    if (prefix && prefix.length > MAX_PREFIX_LENGTH) {
      return res.status(400).json({ error: `prefix excede ${MAX_PREFIX_LENGTH} caracteres` });
    }

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return res.status(400).json({
        error: `contentType não permitido. Tipos aceitos: ${[...ALLOWED_CONTENT_TYPES].join(", ")}`,
      });
    }

    const key = generateFileKey(fileName, prefix || "docs");
    const result = await getPresignedUploadUrl(key, contentType);

    return res.status(200).json({
      uploadUrl: result.uploadUrl,
      fileUrl: result.fileUrl,
      key: result.key,
    });
  } catch (err: unknown) {
    console.error("R2 presign error:", err);
    return res.status(500).json({ error: "Erro ao gerar URL de upload" });
  }
}

/**
 * Verifica se a URL aponta para o storage R2 da aplicação (anti-SSRF).
 * Só permite hosts derivados das envs R2; rejeita qualquer outro destino.
 */
function isAllowedR2Url(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const allowedHosts = new Set<string>();
  const publicUrl = process.env.R2_PUBLIC_URL;
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET_NAME;
  if (publicUrl) {
    try {
      allowedHosts.add(new URL(publicUrl).host);
    } catch {
      /* ignora env malformada */
    }
  }
  if (accountId) {
    allowedHosts.add(`${accountId}.r2.cloudflarestorage.com`);
    if (bucket) allowedHosts.add(`${bucket}.${accountId}.r2.cloudflarestorage.com`);
  }
  return allowedHosts.has(url.host);
}

/**
 * Baixa o arquivo do R2 e extrai o texto plano para indexação semântica.
 * Restrito a perfis de gestão (gerência da base de conhecimento).
 */
async function handleExtract(
  req: VercelRequest,
  res: VercelResponse,
  user: { role: string },
) {
  const { hasPermission } = await import("../shared/agro/auth.js");
  if (!hasPermission(user.role, "knowledge", "create")) {
    return res
      .status(403)
      .json({ error: "Apenas perfis de gestão podem extrair conteúdo da base" });
  }

  const { fileUrl, contentType, fileName } = req.body as {
    fileUrl?: string;
    contentType?: string;
    fileName?: string;
  };

  if (!fileUrl) {
    return res.status(400).json({ error: "fileUrl é obrigatório" });
  }
  if (!isAllowedR2Url(fileUrl)) {
    return res.status(400).json({ error: "fileUrl não permitida" });
  }
  if (contentType && !KB_EXTRACTABLE_CONTENT_TYPES.has(contentType) && !contentType.startsWith("text/")) {
    return res.status(400).json({
      error: `Tipo não suportado para extração: ${contentType}. Aceitos: PDF, DOCX, TXT, Markdown, CSV.`,
    });
  }

  try {
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return res.status(502).json({ error: `Falha ao baixar arquivo (${fileRes.status})` });
    }
    const declaredLen = Number(fileRes.headers.get("content-length") ?? "0");
    if (declaredLen > MAX_EXTRACT_BYTES) {
      return res.status(413).json({ error: "Arquivo excede 15 MB para extração" });
    }
    const buffer = await fileRes.arrayBuffer();
    if (buffer.byteLength > MAX_EXTRACT_BYTES) {
      return res.status(413).json({ error: "Arquivo excede 15 MB para extração" });
    }
    const resolvedType =
      contentType || fileRes.headers.get("content-type") || "application/octet-stream";
    const result = await extractText(buffer, resolvedType, fileName);
    return res.status(200).json(result);
  } catch (err: unknown) {
    console.error("KB extract error:", err);
    const message = err instanceof Error ? err.message : "Erro ao extrair texto";
    return res.status(500).json({ error: message });
  }
}
