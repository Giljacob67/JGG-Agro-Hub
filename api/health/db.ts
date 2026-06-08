import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isDbEnabled } from "../_lib/data-service.js";
import { getSql } from "../_lib/db/client.js";
import { json } from "../_lib/http.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!isDbEnabled()) {
    return json(res, { mode: "memory", connected: false });
  }
  try {
    const sql = getSql();
    await sql`SELECT 1 AS ok`;
    return json(res, { mode: "postgresql", connected: true });
  } catch (err) {
    return json(
      res,
      {
        mode: "postgresql",
        connected: false,
        error: err instanceof Error ? err.message : "Erro de conexão",
      },
      503,
    );
  }
}