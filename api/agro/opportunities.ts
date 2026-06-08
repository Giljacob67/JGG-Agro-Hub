import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOpportunity, listOpportunities } from "../_lib/data-service";
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

  return methodNotAllowed(res);
}