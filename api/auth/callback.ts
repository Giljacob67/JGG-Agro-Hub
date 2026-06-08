import type { VercelRequest, VercelResponse } from "@vercel/node";
import { exchangeSsoCode } from "../_lib/sso.js";
import { methodNotAllowed } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      if (parsed.from) from = parsed.from;
    }
  } catch {
    /* usa default */
  }

  const redirect = new URL(from, process.env.APP_URL ?? "http://localhost:5173");
  redirect.searchParams.set("token", result.token);
  res.redirect(302, redirect.toString());
}