import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveSession, roleCanAccess } from "./auth-server.js";
import type { AgroUser } from "../../shared/agro/types.js";

const DEV_SESSION_COOKIE = "agro_session";
const PROD_SESSION_COOKIE = "__Host-agro_session";

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split("=");
        return [key, decodeURIComponent(rest.join("="))];
      }),
  );
}

function sessionCookieName(): string {
  return process.env.VERCEL_ENV === "production" ? PROD_SESSION_COOKIE : DEV_SESSION_COOKIE;
}

export function getToken(req: VercelRequest): string | undefined {
  return parseCookies(req.headers.cookie)[sessionCookieName()];
}

function cookieBase() {
  // __Host- prefix exige Secure em produção. Em dev local (http) usamos
  // agro_session sem prefixo para não quebrar localhost.
  const isProd = process.env.VERCEL_ENV === "production";
  const secure = isProd ? "; Secure" : "";
  return `HttpOnly; Path=/; SameSite=Lax${secure}`;
}

export function setSessionCookie(res: VercelResponse, token: string) {
  const name = sessionCookieName();
  res.setHeader(
    "Set-Cookie",
    `${name}=${encodeURIComponent(token)}; Max-Age=${7 * 24 * 60 * 60}; ${cookieBase()}`,
  );
}

export function clearSessionCookie(res: VercelResponse) {
  const name = sessionCookieName();
  res.setHeader(
    "Set-Cookie",
    `${name}=; Max-Age=0; ${cookieBase()}`,
  );
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
