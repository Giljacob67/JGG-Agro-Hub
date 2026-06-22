import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { findUserByEmail, issueSessionForUser } from "./auth-server.js";
import type { AgroUser } from "../../shared/agro/types.js";

export interface SsoConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface OidcMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri?: string;
  userinfo_endpoint?: string;
}

interface IdTokenClaims {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
}

const OIDC_META_CACHE = new Map<string, { meta: OidcMetadata; expiresAt: number }>();
const OIDC_META_TTL_MS = 10 * 60 * 1000;

/**
 * Cache de JWKS por issuer. `createRemoteJWKSet` mantém cache interno das chaves
 * e faz refetch automático (com cooldown) quando o kid não é encontrado.
 */
const JWKS_CACHE = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(jwksUri: string) {
  let key = JWKS_CACHE.get(jwksUri);
  if (!key) {
    key = createRemoteJWKSet(new URL(jwksUri));
    JWKS_CACHE.set(jwksUri, key);
  }
  return key;
}

export function getSsoConfig(): SsoConfig | null {
  const issuer = process.env.SSO_ISSUER?.replace(/\/$/, "");
  const clientId = process.env.SSO_CLIENT_ID;
  const clientSecret = process.env.SSO_CLIENT_SECRET;
  const redirectUri = process.env.SSO_REDIRECT_URI;
  if (!issuer || !clientId || !clientSecret || !redirectUri) return null;
  return { issuer, clientId, clientSecret, redirectUri };
}

async function fetchOidcMetadata(issuer: string): Promise<OidcMetadata | null> {
  const cached = OIDC_META_CACHE.get(issuer);
  if (cached && cached.expiresAt > Date.now()) return cached.meta;
  try {
    const res = await fetch(`${issuer}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const meta = (await res.json()) as OidcMetadata;
    OIDC_META_CACHE.set(issuer, { meta, expiresAt: Date.now() + OIDC_META_TTL_MS });
    return meta;
  } catch {
    return null;
  }
}

function base64UrlDecode(value: string): string {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/") + padding, "base64").toString("utf8");
}

export function generatePkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHmac("sha256", verifier).update("").digest("base64url");
  return { verifier, challenge };
}

export async function buildSsoAuthorizeUrl(
  state: string,
  codeChallenge: string,
): Promise<string | null> {
  const cfg = getSsoConfig();
  if (!cfg) return null;
  const meta = await fetchOidcMetadata(cfg.issuer);
  const endpoint = meta?.authorization_endpoint ?? `${cfg.issuer}/oauth2/v2.0/authorize`;
  const url = new URL(endpoint);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("response_mode", "query");
  return url.toString();
}

export async function exchangeSsoCode(
  code: string,
  codeVerifier: string,
  expectedNonce?: string,
): Promise<{
  token: string;
  user: AgroUser;
} | null> {
  const cfg = getSsoConfig();
  if (!cfg) return null;

  const meta = await fetchOidcMetadata(cfg.issuer);
  const tokenEndpoint = meta?.token_endpoint ?? `${cfg.issuer}/oauth2/v2.0/token`;

  const tokenRes = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!tokenRes.ok) return null;
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
  };

  const idToken = tokenJson.id_token;
  if (!idToken) return null;

  const claims = await validateIdToken(idToken, cfg, meta, expectedNonce);
  if (!claims?.email) return null;
  if (!claims.email_verified) return null;

  const user = await findUserByEmail(claims.email);
  if (!user) return null;

  return { token: issueSessionForUser(user), user };
}

/**
 * Valida o id_token verificando a assinatura JWT contra o JWKS do issuer
 * (`jose.jwtVerify` + `createRemoteJWKSet`). Isso fecha o bypass onde um
 * atacante forjava um id_token com payload arbitrário — sem JWKS, iss/aud
 * (públicos) eram a única barreira.
 *
 * `jwtVerify` valida: assinatura (RS/ES/PS, nunca `none`/HS), exp, iss, aud.
 * Verificamos ainda o nonce (CSRF/anti-replay) e exigimos email_verified.
 */
async function validateIdToken(
  idToken: string,
  cfg: SsoConfig,
  meta: OidcMetadata | null,
  expectedNonce?: string,
): Promise<IdTokenClaims | null> {
  if (!meta?.jwks_uri) return null;
  try {
    const { payload } = await jwtVerify(idToken, getJwks(meta.jwks_uri), {
      issuer: cfg.issuer,
      audience: cfg.clientId,
      algorithms: ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "PS256", "PS384", "PS512"],
    });
    const claims = payload as unknown as IdTokenClaims;
    if (expectedNonce && claims.nonce !== expectedNonce) return null;
    return claims;
  } catch {
    return null;
  }
}

export function generateOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function encodeStateWithNonce(state: string, nonce: string, from: string): string {
  const payload = Buffer.from(JSON.stringify({ state, nonce, from })).toString("base64url");
  const sig = createHmac("sha256", authSecretOrDev()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function decodeStateWithNonce(encoded: string): {
  state?: string;
  nonce?: string;
  from?: string;
} | null {
  const [payload, signature] = encoded.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", authSecretOrDev()).update(payload).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    return JSON.parse(base64UrlDecode(payload)) as { state?: string; nonce?: string; from?: string };
  } catch {
    return null;
  }
}

function authSecretOrDev(): string {
  return process.env.AUTH_SECRET?.trim() || "dev-insecure";
}
