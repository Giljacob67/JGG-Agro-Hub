import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  convertLead,
  createLead,
  getLead,
  listLeads,
  updateLead,
} from "../_lib/data-service.js";
import { parseLeadListQuery } from "../_lib/list-query.js";
import { json, methodNotAllowed, requireAuth } from "../_lib/http.js";
import {
  getBody,
  parseLeadConversion,
  parseLeadCreate,
  parseLeadPatch,
} from "../_lib/validation.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "leads")) return;

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    if (id) {
      const lead = await getLead(id);
      if (!lead) return json(res, { error: "Lead não encontrado" }, 404);
      return json(res, lead);
    }
    return json(res, await listLeads(parseLeadListQuery(req)));
  }

  if (req.method === "POST") {
    const body = getBody(req.body);

    if (req.query.action === "convert" || body.action === "convert") {
      const id = (req.query.id as string | undefined) ?? body.id;
      if (!id) return json(res, { error: "id é obrigatório" }, 400);
      const input = parseLeadConversion(body);
      if (!input.ok) return json(res, { error: input.error }, 400);
      const result = await convertLead(String(id), input.data);
      if (!result.ok) {
        const status = result.reason === "not_found" ? 404 : 409;
        const message =
          result.reason === "not_found"
            ? "Lead não encontrado"
            : result.reason === "already_converted"
              ? "Lead já convertido em oportunidade"
              : "Lead descartado não pode ser convertido";
        return json(res, { error: message, reason: result.reason }, status);
      }
      return json(res, result, 201);
    }

    const input = parseLeadCreate(body);
    if (!input.ok) return json(res, { error: input.error }, 400);
    const lead = await createLead(input.data);
    return json(res, lead, 201);
  }

  if (req.method === "PATCH") {
    const id = req.query.id as string | undefined;
    if (!id) return json(res, { error: "id é obrigatório" }, 400);
    const patch = parseLeadPatch(getBody(req.body));
    if (!patch.ok) return json(res, { error: patch.error }, 400);
    const lead = await updateLead(id, patch.data);
    if (!lead) return json(res, { error: "Lead não encontrado" }, 404);
    return json(res, lead);
  }

  return methodNotAllowed(res);
}
