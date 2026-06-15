import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getOpportunity,
  listOpportunities,
  updateOpportunity,
} from "../_lib/data-service.js";
import { parseOpportunityListQuery } from "../_lib/list-query.js";
import { json, methodNotAllowed, requireAuth } from "../_lib/http.js";
import { getBody, parseOpportunityPatch } from "../_lib/validation.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "opportunities")) return;

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    if (id) {
      const opp = await getOpportunity(id);
      if (!opp) return json(res, { error: "Oportunidade não encontrada" }, 404);
      return json(res, opp);
    }
    return json(res, await listOpportunities(parseOpportunityListQuery(req)));
  }

  if (req.method === "PATCH") {
    const id = req.query.id as string | undefined;
    if (!id) return json(res, { error: "id é obrigatório" }, 400);
    const patch = parseOpportunityPatch(getBody(req.body));
    if (!patch.ok) return json(res, { error: patch.error }, 400);
    const opp = await updateOpportunity(id, patch.data);
    if (!opp) return json(res, { error: "Oportunidade não encontrada" }, 404);
    return json(res, opp);
  }

  return methodNotAllowed(res);
}
