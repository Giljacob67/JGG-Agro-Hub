import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveSession, roleCanAccess } from "./auth-server.js";
import { validateCsrfToken, getSessionId } from "./csrf.js";
import { assertWritableInProd } from "./guard.js";
import type { AgroUser } from "../../shared/agro/types.js";

const DEV_SESSION_COOKIE = "agro_session";
const PROD_SESSION_COOKIE = "__Host-agro_session";
const OAUTH_STATE_COOKIE = "agro_oauth_state";
const OAUTH_PKCE_COOKIE = "agro_oauth_pkce";
const DEV_CSRF_COOKIE = "agro_csrf";
const PROD_CSRF_COOKIE = "__Host-agro_csrf";

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

function csrfCookieName(): string {
  return process.env.VERCEL_ENV === "production" ? PROD_CSRF_COOKIE : DEV_CSRF_COOKIE;
}

export function getToken(req: VercelRequest): string | undefined {
  return parseCookies(req.headers.cookie)[sessionCookieName()];
}

function getCsrfCookie(req: VercelRequest): string | undefined {
  return parseCookies(req.headers.cookie)[csrfCookieName()];
}

/**
 * Validate CSRF token for write requests (POST, PATCH, DELETE).
 * Returns true if valid, false if invalid (and sends 403 response).
 */
export function requireCsrf(req: VercelRequest, res: VercelResponse): boolean {
  // Only validate on write methods
  if (req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD") {
    return true;
  }

  const sessionToken = getToken(req);
  const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
  const csrfCookie = getCsrfCookie(req);

  // If no session, let requireAuth handle it
  if (!sessionToken) return true;

  // CSRF token can come from header or cookie
  const csrfToken = csrfHeader || csrfCookie;
  if (!csrfToken) {
    res.status(403).json({ error: "CSRF token ausente" });
    return false;
  }

  if (!validateCsrfToken(sessionToken, csrfToken)) {
    res.status(403).json({ error: "CSRF token inválido" });
    return false;
  }

  return true;
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

export function setOAuthStateCookie(res: VercelResponse, state: string, pkceVerifier: string) {
  const base = cookieBase();
  res.setHeader("Set-Cookie", [
    `${OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; Max-Age=${10 * 60}; ${base}`,
    `${OAUTH_PKCE_COOKIE}=${encodeURIComponent(pkceVerifier)}; Max-Age=${10 * 60}; ${base}`,
  ]);
}

export function clearOAuthCookies(res: VercelResponse) {
  const base = cookieBase();
  res.setHeader("Set-Cookie", [
    `${OAUTH_STATE_COOKIE}=; Max-Age=0; ${base}`,
    `${OAUTH_PKCE_COOKIE}=; Max-Age=0; ${base}`,
  ]);
}

export function readOAuthCookies(req: VercelRequest) {
  const cookies = parseCookies(req.headers.cookie);
  return {
    state: cookies[OAUTH_STATE_COOKIE],
    pkceVerifier: cookies[OAUTH_PKCE_COOKIE],
  };
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

/**
 * Guard de produção: bloqueia escritas memory-only quando DATABASE_URL
 * está ausente em produção. Espelha `requireCsrf` (retorna false e envia
 * a resposta em caso de falha). No-op em dev/local e em produção com DB.
 */
export function guardWrite(res: VercelResponse, resource: string): boolean {
  const g = assertWritableInProd(resource);
  if (!g.ok) {
    json(res, { error: g.message }, g.status);
    return false;
  }
  return true;
}
