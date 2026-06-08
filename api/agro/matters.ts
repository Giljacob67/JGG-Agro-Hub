import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMatter, listMatters } from "../../shared/agro/store";
import { json, methodNotAllowed, requireAuth } from "../_lib/http";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "matters")) return;

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    if (id) {
      const matter = getMatter(id);
      if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
      return json(res, matter);
    }
    return json(res, listMatters());
  }

  return methodNotAllowed(res);
}