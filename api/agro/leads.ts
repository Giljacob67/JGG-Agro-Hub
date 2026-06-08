import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createLead,
  getLead,
  listLeads,
  updateLead,
} from "../_lib/data-service.js";
import { json, methodNotAllowed, requireAuth } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "leads")) return;

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    if (id) {
      const lead = await getLead(id);
      if (!lead) return json(res, { error: "Lead não encontrado" }, 404);
      return json(res, lead);
    }
    return json(res, await listLeads());
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    if (!body.name || !body.region || !body.owner) {
      return json(res, { error: "name, region e owner são obrigatórios" }, 400);
    }
    const lead = await createLead({
      name: String(body.name),
      contact: String(body.contact ?? ""),
      region: String(body.region),
      crop: String(body.crop ?? ""),
      source: String(body.source ?? "Manual"),
      owner: String(body.owner),
      notes: String(body.notes ?? ""),
      nextContact: body.nextContact ?? null,
      accountId: body.accountId ?? null,
      status: body.status,
    });
    return json(res, lead, 201);
  }

  if (req.method === "PATCH") {
    const id = req.query.id as string | undefined;
    if (!id) return json(res, { error: "id é obrigatório" }, 400);
    const lead = await updateLead(id, req.body ?? {});
    if (!lead) return json(res, { error: "Lead não encontrado" }, 404);
    return json(res, lead);
  }

  return methodNotAllowed(res);
}