import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isDbEnabled, setupDatabase } from "../_lib/data-service";
import { json, methodNotAllowed } from "../_lib/http";

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
    const result = await setupDatabase();
    return json(res, { ok: true, ...result });
  } catch (err) {
    return json(
      res,
      { error: err instanceof Error ? err.message : "Falha no setup" },
      500,
    );
  }
}