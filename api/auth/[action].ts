import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, resolveSession } from "../_lib/auth-server.js";
import { generateCsrfToken } from "../_lib/csrf.js";
import {
  buildSsoAuthorizeUrl,
  decodeStateWithNonce,
  encodeStateWithNonce,
  exchangeSsoCode,
  generateOAuthState,
  generatePkcePair,
  getSsoConfig,
} from "../_lib/sso.js";
import {
  clearOAuthCookies,
  clearSessionCookie,
  getToken,
  json,
  methodNotAllowed,
  readOAuthCookies,
  setCsrfCookie,
  setOAuthStateCookie,
  setSessionCookie,
} from "../_lib/http.js";
import { checkLoginRateLimit, clearLoginRateLimit } from "../_lib/rate-limit.js";

/**
 * Endpoint único de autenticação (rota dinâmica) — consolida login, me,
 * sso e callback em uma só serverless function para respeitar o limite
 * de 12 functions do plano Hobby da Vercel. As URLs públicas não mudam:
 * /api/auth/login, /api/auth/me, /api/auth/sso, /api/auth/callback.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query.action ?? "");

  switch (action) {
    case "login":
      return await login(req, res);
    case "me":
      return me(req, res);
    case "logout":
      return logout(req, res);
    case "sso":
      return await sso(req, res);
    case "callback":
      return await callback(req, res);
    default:
      return json(res, { error: "Rota não encontrada" }, 404);
  }
}

async function login(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return json(res, { error: "E-mail e senha são obrigatórios" }, 400);
  }

  const normalizedEmail = String(email);
  const rate = await checkLoginRateLimit(req, normalizedEmail);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSeconds));
    return json(res, { error: "Muitas tentativas. Tente novamente mais tarde." }, 429);
  }

  const result = authenticate(normalizedEmail, String(password));
  if (!result) return json(res, { error: "Credenciais inválidas" }, 401);

  await clearLoginRateLimit(req, normalizedEmail);
  setSessionCookie(res, result.token);

  // Generate CSRF token (cookie preserva o de sessão — setCsrfCookie faz merge)
  const csrfToken = generateCsrfToken(result.token);
  setCsrfCookie(res, csrfToken);

  return json(res, { user: result.user, csrfToken });
}

function me(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const user = resolveSession(getToken(req));
  if (!user) return json(res, { error: "Não autenticado" }, 401);

  return json(res, user);
}

function logout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  clearSessionCookie(res);
  clearOAuthCookies(res);
  return json(res, { ok: true });
}

/** Aceita apenas paths internos ("/...") — bloqueia open redirect. */
function sanitizeFrom(raw: unknown): string {
  const value = String(raw ?? "");
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/agro/command-center";
}

async function sso(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const cfg = getSsoConfig();
  if (!cfg) {
    return json(res, { error: "SSO não configurado" }, 503);
  }

  const from = sanitizeFrom(req.query.from);
  const state = generateOAuthState();
  const nonce = generateOAuthState();
  const { verifier, challenge } = generatePkcePair();
  const encodedState = encodeStateWithNonce(state, nonce, from);

  const url = await buildSsoAuthorizeUrl(encodedState, challenge);
  if (!url) return json(res, { error: "SSO indisponível" }, 503);

  setOAuthStateCookie(res, state, verifier);
  res.redirect(302, url);
}

async function callback(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const code = String(req.query.code ?? "");
  if (!code) {
    clearOAuthCookies(res);
    res.redirect(302, "/agro/login?error=sso");
    return;
  }

  const queryState = String(req.query.state ?? "");
  if (!queryState) {
    clearOAuthCookies(res);
    res.redirect(302, "/agro/login?error=sso_state");
    return;
  }

  const parsed = decodeStateWithNonce(queryState);
  if (!parsed?.state || !parsed.nonce) {
    clearOAuthCookies(res);
    res.redirect(302, "/agro/login?error=sso_state");
    return;
  }

  const cookies = readOAuthCookies(req);
  if (cookies.state !== parsed.state) {
    clearOAuthCookies(res);
    res.redirect(302, "/agro/login?error=sso_state");
    return;
  }

  if (!cookies.pkceVerifier) {
    clearOAuthCookies(res);
    res.redirect(302, "/agro/login?error=sso_pkce");
    return;
  }

  const result = await exchangeSsoCode(code, cookies.pkceVerifier, parsed.nonce);
  clearOAuthCookies(res);
  if (!result) {
    res.redirect(302, "/agro/login?error=sso");
    return;
  }

  const from = sanitizeFrom(parsed.from);
  const redirect = new URL(from, process.env.APP_URL ?? "http://localhost:5173");
  setSessionCookie(res, result.token);
  // CSRF cookie para usuários SSO: o header X-CSRF-Token não está disponível
  // (SPA não recebe o token no body), então o fallback por cookie é necessário.
  setCsrfCookie(res, generateCsrfToken(result.token));
  res.redirect(302, redirect.toString());
}
