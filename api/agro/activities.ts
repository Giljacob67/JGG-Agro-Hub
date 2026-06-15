import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createActivity, listActivities } from "../_lib/data-service.js";
import { json, methodNotAllowed, requireAuth } from "../_lib/http.js";
import {
  getBody,
  isActivityEntityType,
  parseActivityCreate,
} from "../_lib/validation.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "activities")) return;

  if (req.method === "GET") {
    const entityId = req.query.entityId as string | undefined;
    const rawEntityType = req.query.entityType;
    const entityType =
      typeof rawEntityType === "string" && isActivityEntityType(rawEntityType)
        ? rawEntityType
        : undefined;
    if (rawEntityType && !entityType) {
      return json(res, { error: "entityType inválido" }, 400);
    }
    return json(res, await listActivities(entityId, entityType));
  }

  if (req.method === "POST") {
    const input = parseActivityCreate(getBody(req.body));
    if (!input.ok) return json(res, { error: input.error }, 400);
    const activity = await createActivity(input.data);
    return json(res, activity, 201);
  }

  return methodNotAllowed(res);
}
