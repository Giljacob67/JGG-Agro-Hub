import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getKnowledgePayload } from "../../../shared/agro/knowledge.js";
import { json, methodNotAllowed, requireAuth } from "../../_lib/http.js";

/**
 * GET /api/agro/knowledge?categoryId=
 *
 * Futuro:
 * - Busca semântica com embeddings (RAG)
 * - Versionamento e auditoria de documentos
 * - Integração com repositório documental interno
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "knowledge")) return;

  if (req.method === "GET") {
    const categoryId =
      typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
    return json(res, getKnowledgePayload(categoryId));
  }

  return methodNotAllowed(res);
}