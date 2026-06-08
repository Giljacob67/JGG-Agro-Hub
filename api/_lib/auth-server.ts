import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import {
  resolveSession as resolveDevSession,
  roleCanAccess,
} from "../../shared/agro/auth.js";
import type { AgroRole, AgroUser } from "../../shared/agro/types.js";

export { roleCanAccess };

const PASSWORD_SALT = "agro-jgg-salt-v1";
const DEV_PASSWORD_HASH =
  "8c34565dfb4fdcfc07a85e0a36b7edd6b7c521f5bb2d1da3231b18065a4e9e0e";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface UserRecord extends AgroUser {
  passwordHash: string;
}

const USERS: UserRecord[] = [
  {
    id: "usr-1",
    email: "agro@jgggroup.com.br",
    name: "Ana Ribeiro",
    role: "gestao",
    passwordHash: DEV_PASSWORD_HASH,
  },
  {
    id: "usr-2",
    email: "comercial@jgggroup.com.br",
    name: "Carlos Mendes",
    role: "comercial",
    passwordHash: DEV_PASSWORD_HASH,
  },
  {
    id: "usr-3",
    email: "juridico@jgggroup.com.br",
    name: "Equipe Jurídica Agro",
    role: "juridico",
    passwordHash: DEV_PASSWORD_HASH,
  },
];

interface TokenPayload extends AgroUser {
  exp: number;
}

function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || undefined;
}

function verifyPassword(password: string, hashHex: string): boolean {
  const derived = scryptSync(password, PASSWORD_SALT, 32);
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
  if (!record || !verifyPassword(password, record.passwordHash)) return null;

  const user: AgroUser = {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
  };

  const secret = getAuthSecret();
  const token = secret ? signToken(user, secret) : signToken(user, "dev-insecure");
  return { token, user };
}

export function issueSessionForUser(user: AgroUser): string {
  const secret = getAuthSecret();
  return secret ? signToken(user, secret) : signToken(user, "dev-insecure");
}

export function resolveSession(token: string | undefined): AgroUser | null {
  if (!token) return null;
  const secret = getAuthSecret();
  if (secret) {
    const user = verifySignedToken(token, secret);
    if (user) return user;
  }
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