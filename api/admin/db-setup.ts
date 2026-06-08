import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isDbEnabled, setupDatabase } from "../_lib/data-service.js";
import { json, methodNotAllowed } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);

  const secret = process.env.AGRO_SETUP_SECRET;
  const header = req.headers["x-setup-secret"];

  if (!secret || header !== secret) {
    return json(res, { error: "Não autorizado" }, 401);
  }

  if (!isDbEnabled()) {
    return json(res, { error: "DATABASE_URL não configurada" }, 503);
  }

  try {
    const force = req.query.force === "1" || req.body?.force === true;
    const result = await setupDatabase({ force });
    return json(res, { ok: true, ...result });
  } catch (err) {
    return json(
      res,
      { error: err instanceof Error ? err.message : "Falha no setup" },
      500,
    );
  }
}