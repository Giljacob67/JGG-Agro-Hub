import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate } from "../../shared/agro/auth";
import { json, methodNotAllowed } from "../_lib/http";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return json(res, { error: "E-mail e senha são obrigatórios" }, 400);
  }

  const result = authenticate(String(email), String(password));
  if (!result) return json(res, { error: "Credenciais inválidas" }, 401);

  return json(res, result);
}