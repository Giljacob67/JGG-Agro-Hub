import type { VercelRequest, VercelResponse } from "@vercel/node";
import { computeCrmStats } from "../../shared/agro/stats";
import { json, methodNotAllowed, requireAuth } from "../_lib/http";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res, "stats")) return;

  if (req.method === "GET") {
    return json(res, computeCrmStats());
  }

  return methodNotAllowed(res);
}