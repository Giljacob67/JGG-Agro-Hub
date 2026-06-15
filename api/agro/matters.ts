import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getMatter,
  getMattersByOpportunity,
  listMatters,
  updateMatter,
} from "../_lib/data-service.js";
import { parseMatterListQuery } from "../_lib/list-query.js";
import { json, methodNotAllowed, requireAuth } from "../_lib/http.js";
import { getBody, parseMatterPatch } from "../_lib/validation.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "matters")) return;

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    if (id) {
      const matter = await getMatter(id);
      if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
      return json(res, matter);
    }
    const opportunityId = req.query.opportunityId as string | undefined;
    if (opportunityId) {
      return json(res, await getMattersByOpportunity(opportunityId));
    }
    return json(res, await listMatters(parseMatterListQuery(req)));
  }

  if (req.method === "PATCH") {
    const id = req.query.id as string | undefined;
    if (!id) return json(res, { error: "id é obrigatório" }, 400);
    const patch = parseMatterPatch(getBody(req.body));
    if (!patch.ok) return json(res, { error: patch.error }, 400);
    const matter = await updateMatter(id, patch.data);
    if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);
    return json(res, matter);
  }

  return methodNotAllowed(res);
}
