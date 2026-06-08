import type { VercelRequest, VercelResponse } from "@vercel/node";
import { computeCrmStats } from "../../shared/agro/stats.js";
import { loadCrmDataset } from "../_lib/data-service.js";
import { json, methodNotAllowed, requireAuth } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "stats")) return;

  if (req.method === "GET") {
    const dataset = await loadCrmDataset();
    return json(
      res,
      computeCrmStats({
        leads: dataset.leads,
        opportunities: dataset.opportunities,
        matters: dataset.matters,
        tasks: dataset.tasks,
      }),
    );
  }

  return methodNotAllowed(res);
}