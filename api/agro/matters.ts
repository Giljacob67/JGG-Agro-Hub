import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMatter, listMatters, updateMatter } from "../_lib/data-service.js";
import { parseMatterListQuery } from "../_lib/list-query.js";
import { json, methodNotAllowed, requireAuth } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "matters")) return;

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    if (id) {
      const matter = await getMatter(id);
      if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
      return json(res, matter);
    }
    return json(res, await listMatters(parseMatterListQuery(req)));
  }

  if (req.method === "PATCH") {
    const id = req.query.id as string | undefined;
    if (!id) return json(res, { error: "id é obrigatório" }, 400);
    const matter = await updateMatter(id, req.body ?? {});
    if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
    return json(res, matter);
  }

  return methodNotAllowed(res);
}