import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "node:crypto";
import { authenticate, resolveSession } from "../_lib/auth-server.js";
import { buildSsoAuthorizeUrl, exchangeSsoCode, getSsoConfig } from "../_lib/sso.js";
import {
  clearSessionCookie,
  getToken,
  json,
  methodNotAllowed,
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
      return sso(req, res);
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
  return json(res, { user: result.user });
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
  return json(res, { ok: true });
}

/** Aceita apenas paths internos ("/...") — bloqueia open redirect. */
function sanitizeFrom(raw: unknown): string {
  const value = String(raw ?? "");
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/agro/command-center";
}

function stateSecret() {
  return process.env.AUTH_SECRET?.trim() || "dev-insecure";
}

function signStatePayload(payload: string) {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

function encodeState(data: { from: string }) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${signStatePayload(payload)}`;
}

function decodeState(state: string): { from?: string } | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = signStatePayload(payload);
  const sig = Buffer.from(signature);
  const exp = Buffer.from(expected);
  if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      from?: string;
    };
  } catch {
    return null;
  }
}

function sso(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const cfg = getSsoConfig();
  if (!cfg) {
    return json(res, { error: "SSO não configurado" }, 503);
  }

  const from = sanitizeFrom(req.query.from);
  const state = encodeState({ from });
  const url = buildSsoAuthorizeUrl(state);
  if (!url) return json(res, { error: "SSO indisponível" }, 503);

  res.redirect(302, url);
}

async function callback(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const code = String(req.query.code ?? "");
  if (!code) {
    res.redirect(302, "/agro/login?error=sso");
    return;
  }

  const result = await exchangeSsoCode(code);
  if (!result) {
    res.redirect(302, "/agro/login?error=sso");
    return;
  }

  let from = "/agro/command-center";
  const state = String(req.query.state ?? "");
  if (state) {
    const parsed = decodeState(state);
    if (!parsed) {
      res.redirect(302, "/agro/login?error=sso_state");
      return;
    }
    if (parsed.from) from = sanitizeFrom(parsed.from);
  }

  const redirect = new URL(from, process.env.APP_URL ?? "http://localhost:5173");
  setSessionCookie(res, result.token);
  res.redirect(302, redirect.toString());
}
