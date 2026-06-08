import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveCopilotQuery } from "../../../shared/agro/copilot.js";
import { computeCrmStats } from "../../../shared/agro/stats.js";
import { loadCrmDataset } from "../../_lib/data-service.js";
import { json, methodNotAllowed, requireAuth } from "../../_lib/http.js";
import type { CopilotQueryRequest } from "../../../shared/agro/types.js";

/**
 * POST /api/agro/copilot/query
 *
 * Futuro:
 * - Integrar OPENAI_API_KEY ou provedor equivalente (não expor no cliente)
 * - Camada de embeddings + RAG sobre KNOWLEDGE_DOCUMENTS
 * - Persistência de histórico de sessões por usuário
 * - Enriquecimento com contexto CRM em tempo real
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "copilot")) return;

  if (req.method === "POST") {
    const body = (req.body ?? {}) as CopilotQueryRequest;
    if (!body.query?.trim()) {
      return json(res, { error: "query é obrigatório" }, 400);
    }

    const dataset = await loadCrmDataset();
    const stats = computeCrmStats({
      leads: dataset.leads,
      accounts: dataset.accounts,
      opportunities: dataset.opportunities,
      matters: dataset.matters,
      tasks: dataset.tasks,
    });

    const response = resolveCopilotQuery(
      { query: body.query.trim(), contextEntity: body.contextEntity ?? null },
      stats,
    );

    return json(res, response);
  }

  return methodNotAllowed(res);
}