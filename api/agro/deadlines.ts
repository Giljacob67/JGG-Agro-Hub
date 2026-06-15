import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createDeadline,
  getMatter,
  listDeadlines,
  updateDeadline,
} from "../_lib/data-service.js";
import { json, methodNotAllowed, requireAuth } from "../_lib/http.js";
import {
  getBody,
  parseDeadlineCreate,
  parseDeadlinePatch,
} from "../_lib/validation.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "deadlines")) return;

  if (req.method === "GET") {
    const matterId = req.query.matterId as string | undefined;
    return json(res, await listDeadlines(matterId));
  }

  if (req.method === "POST") {
    const input = parseDeadlineCreate(getBody(req.body));
    if (!input.ok) return json(res, { error: input.error }, 400);
    const matter = await getMatter(input.data.matterId);
    if (!matter) return json(res, { error: "Demanda não encontrada" }, 404);

    const deadline = await createDeadline(input.data);
    return json(res, deadline, 201);
  }

  if (req.method === "PATCH") {
    const id = req.query.id as string | undefined;
    if (!id) return json(res, { error: "id é obrigatório" }, 400);
    const patch = parseDeadlinePatch(getBody(req.body));
    if (!patch.ok) return json(res, { error: patch.error }, 400);
    const deadline = await updateDeadline(id, patch.data);
    if (!deadline) return json(res, { error: "Prazo não encontrado" }, 404);
    return json(res, deadline);
  }

  return methodNotAllowed(res);
}
