import { findUserByEmail, issueSessionForUser } from "./auth-server.js";

export interface SsoConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getSsoConfig(): SsoConfig | null {
  const issuer = process.env.SSO_ISSUER?.replace(/\/$/, "");
  const clientId = process.env.SSO_CLIENT_ID;
  const clientSecret = process.env.SSO_CLIENT_SECRET;
  const redirectUri = process.env.SSO_REDIRECT_URI;
  if (!issuer || !clientId || !clientSecret || !redirectUri) return null;
  return { issuer, clientId, clientSecret, redirectUri };
}

export function buildSsoAuthorizeUrl(state: string): string | null {
  const cfg = getSsoConfig();
  if (!cfg) return null;
  const url = new URL(`${cfg.issuer}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeSsoCode(code: string): Promise<{
  token: string;
  user: import("../../shared/agro/types.js").AgroUser;
} | null> {
  const cfg = getSsoConfig();
  if (!cfg) return null;

  const tokenRes = await fetch(`${cfg.issuer}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
    }),
  });

  if (!tokenRes.ok) return null;
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
  };

  const accessToken = tokenJson.access_token;
  if (!accessToken) return null;

  const profileRes = await fetch(`${cfg.issuer}/oauth2/v2.0/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) return null;

  const profile = (await profileRes.json()) as { email?: string };
  if (!profile.email) return null;

  const user = findUserByEmail(profile.email);
  if (!user) return null;

  return { token: issueSessionForUser(user), user };
}