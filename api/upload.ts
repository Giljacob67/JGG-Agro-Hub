import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, applyCors } from "./_lib/http.js";
import { getPresignedUploadUrl, generateFileKey, isR2Configured } from "./_lib/r2.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = requireAuth(req, res, "matters");
  if (!user) return;

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

    const key = generateFileKey(fileName, prefix || "docs");
    const result = await getPresignedUploadUrl(key, contentType);

    return res.status(200).json({
      uploadUrl: result.uploadUrl,
      fileUrl: result.fileUrl,
      key: result.key,
    });
  } catch (err: unknown) {
    console.error("R2 presign error:", err);
    const message = err instanceof Error ? err.message : "Erro ao gerar URL de upload";
    return res.status(500).json({ error: message });
  }
}
