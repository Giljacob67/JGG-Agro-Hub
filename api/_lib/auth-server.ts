import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import {
  resolveSession as resolveDevSession,
  roleCanAccess,
  hasPermission,
  getResourcePermissions,
  getAccessibleResources,
} from "../../shared/agro/auth.js";
import type { AgroUser } from "../../shared/agro/types.js";

export { roleCanAccess, hasPermission, getResourcePermissions, getAccessibleResources };


interface UserRecord extends AgroUser {
  /** Env var com o hash scrypt (hex) da senha do usuário em produção. */
  passwordHashEnv: string;
}

const USERS: UserRecord[] = [
  {
    id: "usr-1",
    email: "agro@jgggroup.com.br",
    name: "Ana Ribeiro",
    role: "gestao",
    passwordHashEnv: "AUTH_PASSWORD_HASH_GESTAO",
  },
  {
    id: "usr-2",
    email: "comercial@jgggroup.com.br",
    name: "Carlos Mendes",
    role: "comercial",
    passwordHashEnv: "AUTH_PASSWORD_HASH_COMERCIAL",
  },
  {
    id: "usr-3",
    email: "juridico@jgggroup.com.br",
    name: "Equipe Jurídica Agro",
    role: "juridico",
    passwordHashEnv: "AUTH_PASSWORD_HASH_JURIDICO",
  },
];

interface TokenPayload extends AgroUser {
  exp: number;
}

function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || undefined;
}

function getPasswordSalt(): string | null {
  const salt = process.env.AUTH_PASSWORD_SALT?.trim();
  if (salt) return salt;
  if (isSecureAuthEnabled()) return null;
  // Dev local sem AUTH_SECRET pode usar salt fixo para DX.
  return "agro-jgg-salt-v1";
}

/**
 * Resolve o hash de senha do usuário:
 * - Produção (AUTH_SECRET definido): exige hash individual via env var;
 *   sem hash configurado, login por senha fica DESABILITADO para o usuário
 *   (resta o SSO).
 * - Dev local (sem AUTH_SECRET): aceita a senha de desenvolvimento.
 */
function resolvePasswordHash(record: UserRecord): {
  hash: string | null;
  salt: string | null;
} {
  const fromEnv = process.env[record.passwordHashEnv]?.trim();
  const salt = getPasswordSalt();
  if (fromEnv) return { hash: fromEnv, salt };
  if (!isSecureAuthEnabled()) return { hash: DEV_PASSWORD_HASH, salt: "agro-jgg-salt-v1" };
  return { hash: null, salt };
}

/** Hash de "jgg-agro-dev" — aceito SOMENTE quando AUTH_SECRET está ausente (dev local). */
const DEV_PASSWORD_HASH =
  "8c34565dfb4fdcfc07a85e0a36b7edd6b7c521f5bb2d1da3231b18065a4e9e0e";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function verifyPassword(
  password: string,
  hashHex: string,
  salt: string,
): boolean {
  const derived = scryptSync(password, salt, 32);
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function signToken(user: AgroUser, secret: string): string {
  const payload: TokenPayload = { ...user, exp: Date.now() + TOKEN_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySignedToken(token: string, secret: string): AgroUser | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as TokenPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function findUserByEmail(email: string): AgroUser | null {
  const user = USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export function authenticate(
  email: string,
  password: string,
): { token: string; user: AgroUser } | null {
  const record = USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (!record) return null;

  const { hash, salt } = resolvePasswordHash(record);
  if (!hash || !salt) return null;

  if (!verifyPassword(password, hash, salt)) return null;

  const user: AgroUser = {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
  };

  const secret = getAuthSecret();
  if (!secret) {
    if (isProduction()) {
      throw new Error("AUTH_SECRET é obrigatório em produção");
    }
    return { token: signToken(user, "dev-insecure"), user };
  }
  return { token: signToken(user, secret), user };
}

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function issueSessionForUser(user: AgroUser): string {
  const secret = getAuthSecret();
  if (!secret) {
    if (isProduction()) {
      throw new Error("AUTH_SECRET é obrigatório em produção");
    }
    return signToken(user, "dev-insecure");
  }
  return signToken(user, secret);
}

export function resolveSession(token: string | undefined): AgroUser | null {
  if (!token) return null;
  const secret = getAuthSecret();
  if (secret) {
    // Com AUTH_SECRET definido, SOMENTE tokens assinados com ele são válidos.
    // Nunca cair nos caminhos de desenvolvimento ("dev-insecure" / token legado),
    // que são forjáveis por qualquer cliente.
    return verifySignedToken(token, secret);
  }
  // Sem AUTH_SECRET: o fallback dev ("dev-insecure" / token legado) só é
  // permitido em ambiente local (sem VERCEL_ENV). Em qualquer deployment
  // Vercel (preview ou production) sem AUTH_SECRET, recusa — o secret
  // "dev-insecure" é público e forjável, não pode autenticar em deploy.
  if (process.env.VERCEL_ENV) return null;
  const devUser = verifySignedToken(token, "dev-insecure");
  if (devUser) return devUser;
  return resolveDevSession(token);
}

export function isSecureAuthEnabled(): boolean {
  return !!getAuthSecret();
}

export function isSsoEnabled(): boolean {
  return (
    process.env.SSO_ENABLED === "true" &&
    !!process.env.SSO_ISSUER &&
    !!process.env.SSO_CLIENT_ID &&
    !!process.env.SSO_CLIENT_SECRET &&
    !!process.env.SSO_REDIRECT_URI
  );
}