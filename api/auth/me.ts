import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveSession } from "../../shared/agro/auth.js";
import { getToken, json, methodNotAllowed } from "../_lib/http.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const user = resolveSession(getToken(req));
  if (!user) return json(res, { error: "Não autenticado" }, 401);

  return json(res, user);
}