import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, resolveSession } from "../_lib/auth-server.js";
import { buildSsoAuthorizeUrl, exchangeSsoCode, getSsoConfig } from "../_lib/sso.js";
import { getToken, json, methodNotAllowed } from "../_lib/http.js";

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
      return login(req, res);
    case "me":
      return me(req, res);
    case "sso":
      return sso(req, res);
    case "callback":
      return callback(req, res);
    default:
      return json(res, { error: "Rota não encontrada" }, 404);
  }
}

function login(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return json(res, { error: "E-mail e senha são obrigatórios" }, 400);
  }

  const result = authenticate(String(email), String(password));
  if (!result) return json(res, { error: "Credenciais inválidas" }, 401);

  return json(res, result);
}

function me(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const user = resolveSession(getToken(req));
  if (!user) return json(res, { error: "Não autenticado" }, 401);

  return json(res, user);
}

/** Aceita apenas paths internos ("/...") — bloqueia open redirect. */
function sanitizeFrom(raw: unknown): string {
  const value = String(raw ?? "");
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/agro/command-center";
}

function sso(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const cfg = getSsoConfig();
  if (!cfg) {
    return json(res, { error: "SSO não configurado" }, 503);
  }

  const from = sanitizeFrom(req.query.from);
  const state = Buffer.from(JSON.stringify({ from })).toString("base64url");
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
  try {
    const state = String(req.query.state ?? "");
    if (state) {
      const parsed = JSON.parse(
        Buffer.from(state, "base64url").toString("utf8"),
      ) as { from?: string };
      if (parsed.from) from = sanitizeFrom(parsed.from);
    }
  } catch {
    /* usa default */
  }

  const redirect = new URL(from, process.env.APP_URL ?? "http://localhost:5173");
  redirect.searchParams.set("token", result.token);
  res.redirect(302, redirect.toString());
}
