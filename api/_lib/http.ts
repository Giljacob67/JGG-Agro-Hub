import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveSession, roleCanAccess } from "./auth-server.js";
import type { AgroUser } from "../../shared/agro/types.js";

export function getToken(req: VercelRequest): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}

export function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
  resource: string,
): AgroUser | null {
  const user = resolveSession(getToken(req));
  if (!user) {
    res.status(401).json({ error: "Não autenticado" });
    return null;
  }
  if (!roleCanAccess(user.role, resource)) {
    res.status(403).json({ error: "Sem permissão para este recurso" });
    return null;
  }
  return user;
}

export function json<T>(res: VercelResponse, data: T, status = 200) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.json(data);
}

export function methodNotAllowed(res: VercelResponse) {
  res.status(405).json({ error: "Método não permitido" });
}