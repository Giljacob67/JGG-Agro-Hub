import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getOpportunity,
  listOpportunities,
  updateOpportunity,
} from "../_lib/data-service";
import { json, methodNotAllowed, requireAuth } from "../_lib/http";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "opportunities")) return;

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    if (id) {
      const opp = await getOpportunity(id);
      if (!opp) return json(res, { error: "Oportunidade não encontrada" }, 404);
      return json(res, opp);
    }
    return json(res, await listOpportunities());
  }

  if (req.method === "PATCH") {
    const id = req.query.id as string | undefined;
    if (!id) return json(res, { error: "id é obrigatório" }, 400);
    const opp = await updateOpportunity(id, req.body ?? {});
    if (!opp) return json(res, { error: "Oportunidade não encontrada" }, 404);
    return json(res, opp);
  }

  return methodNotAllowed(res);
}