import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLead, listLeads } from "../../shared/agro/store";
import { json, methodNotAllowed, requireAuth } from "../_lib/http";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "leads")) return;

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    if (id) {
      const lead = getLead(id);
      if (!lead) return json(res, { error: "Lead não encontrado" }, 404);
      return json(res, lead);
    }
    return json(res, listLeads());
  }

  return methodNotAllowed(res);
}