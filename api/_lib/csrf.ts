/**
 * CSRF token generation and validation — double-submit *stateless*.
 *
 * O token é o HMAC-SHA256 do token de sessão sob `CSRF_SECRET`. Por ser
 * derivado deterministicamente da sessão, dispensa store server-side
 * (sobrevive a cold starts / múltiplas instâncias serverless) e não pode
 * ser forjado por um atacante que não conhece a sessão (cookie HttpOnly).
 *
 * Validação exige o header `X-CSRF-Token` (ver `requireCsrf` em http.ts):
 * o cookie CSRF é apenas o transporte para o SPA ecoá-lo no header.
 */

import crypto from "crypto";

/**
 * Segredo do HMAC. Em produção exige `CSRF_SECRET` ou `AUTH_SECRET`; sem
 * eles, falha-fechado (lança) em vez de cair num default público. Em dev
 * usa um fallback fixo para não travar o localhost.
 */
function csrfSecret(): string {
  const secret = process.env.CSRF_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("CSRF_SECRET/AUTH_SECRET ausente em produção");
  }
  return "jgg-csrf-dev-secret";
}

/**
 * Gera o CSRF token para uma sessão: HMAC(secret, sessionToken).
 * Determinístico — a mesma sessão sempre produz o mesmo token.
 */
export function generateCsrfToken(sessionId: string): string {
  return crypto.createHmac("sha256", csrfSecret()).update(sessionId).digest("hex");
}

/**
 * Valida o CSRF token recomputando o HMAC da sessão e comparando em
 * tempo constante. Sem store: imune a divergência entre instâncias.
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  if (!token) return false;
  const expected = generateCsrfToken(sessionId);
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** Extrai o session id do cookie de auth. */
export function getSessionId(cookies: Record<string, string>): string | null {
  return cookies["agro_session"] || null;
}
