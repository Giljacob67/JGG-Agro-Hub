import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMatter, listMatters } from "../_lib/data-service";
import { json, methodNotAllowed, requireAuth } from "../_lib/http";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "matters")) return;

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    if (id) {
      const matter = await getMatter(id);
      if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
      return json(res, matter);
    }
    return json(res, await listMatters());
  }

  return methodNotAllowed(res);
}