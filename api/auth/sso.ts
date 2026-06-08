import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildSsoAuthorizeUrl, getSsoConfig } from "../_lib/sso.js";
import { json, methodNotAllowed } from "../_lib/http.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const cfg = getSsoConfig();
  if (!cfg) {
    return json(res, { error: "SSO não configurado" }, 503);
  }

  const from = String(req.query.from ?? "/agro/command-center");
  const state = Buffer.from(JSON.stringify({ from })).toString("base64url");
  const url = buildSsoAuthorizeUrl(state);
  if (!url) return json(res, { error: "SSO indisponível" }, 503);

  res.redirect(302, url);
}