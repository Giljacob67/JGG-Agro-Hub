import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isDbEnabled } from "../_lib/data-service";
import { getSql } from "../_lib/db/client";
import { json } from "../_lib/http";

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