import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  roleCanAccess,
  hasPermission,
  getResourcePermissions,
  getAccessibleResources,
} from "../../shared/agro/auth.js";
import type { AgroUser } from "../../shared/agro/types.js";
import { isDbEnabled } from "./db/client.js";
import * as db from "./db/repository.js";

export { roleCanAccess, hasPermission, getResourcePermissions, getAccessibleResources };


/**
 * Identidade de fallback (dev local sem DB) e fonte de seed para `agro.users`.
 * Em produção com DB habilitado, a identidade é lida de `agro.users`
 * (id/email/name/role); a senha continua sendo validada por hash env-driven
 * (ROLE_HASH_ENV abaixo), mantendo o modelo de rotação via env sem bake de
 * hashes no banco.
 */
const USERS: AgroUser[] = [
  { id: "usr-1", email: "agro@jgggroup.com.br", name: "Equipe Gestão Agro", role: "gestao" },
  { id: "usr-2", email: "comercial@jgggroup.com.br", name: "Carlos Mendes", role: "comercial" },
  { id: "usr-3", email: "juridico@jgggroup.com.br", name: "Equipe Jurídica Agro", role: "juridico" },
];

/** Env var de hash de senha por papel (produção). */
const ROLE_HASH_ENV: Record<AgroUser["role"], string> = {
  gestao: "AUTH_PASSWORD_HASH_GESTAO",
  comercial: "AUTH_PASSWORD_HASH_COMERCIAL",
  juridico: "AUTH_PASSWORD_HASH_JURIDICO",
};

/** Fonte canônica de usuários para seed de `agro.users` (db:setup). */
export function getSeedUsers(): AgroUser[] {
  return USERS.map((u) => ({ ...u }));
}

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
 * Resolve o hash de senha para um papel:
 * - Produção (AUTH_SECRET definido): exige hash individual via env var
 *   (ROLE_HASH_ENV[role]); sem hash configurado, login por senha fica
 *   DESABILITADO para o papel (resta o SSO).
 * - Dev local (sem AUTH_SECRET): aceita a senha de desenvolvimento.
 */
function resolvePasswordHash(role: AgroUser["role"]): {
  hash: string | null;
  salt: string | null;
} {
  const fromEnv = process.env[ROLE_HASH_ENV[role]]?.trim();
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

/**
 * Gera hash scrypt + salt aleatório para uma senha individual (gestão de
 * usuários). O salt é por-usuário (independente de AUTH_PASSWORD_SALT) e
 * armazenado junto do hash em `agro.users`.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return { hash, salt };
}

/** ID estável para novos usuários criados via gestão. */
export function generateUserId(): string {
  return `usr-${randomBytes(8).toString("hex")}`;
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

export async function findUserByEmail(email: string): Promise<AgroUser | null> {
  if (isDbEnabled()) {
    try {
      const fromDb = await db.dbFindUserByEmail(email);
      if (fromDb) return fromDb;
    } catch (err) {
      console.warn("[auth] dbFindUserByEmail falhou, fallback USERS", err);
    }
  }
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

export async function authenticate(
  email: string,
  password: string,
): Promise<{ token: string; user: AgroUser } | null> {
  // Em DB, buscar credenciais por-usuário (hash/salt/active) antes de cair
  // no fallback por papel. Usuários inativos são rejeitados no login.
  let user: AgroUser | null = null;
  let perUserHash: string | null = null;
  let perUserSalt: string | null = null;

  if (isDbEnabled()) {
    try {
      const auth = await db.dbFindUserAuthByEmail(email);
      if (auth) {
        if (!auth.active) return null; // conta desativada
        user = { id: auth.id, email: auth.email, name: auth.name, role: auth.role };
        perUserHash = auth.passwordHash;
        perUserSalt = auth.salt;
      }
    } catch (err) {
      console.warn("[auth] dbFindUserAuthByEmail falhou, fallback", err);
    }
  }

  if (!user) {
    user = await findUserByEmail(email);
    if (!user) return null;
  }

  // Senha individual (agro.users) tem precedência; senão, hash por papel (env).
  let hash: string | null;
  let salt: string | null;
  if (perUserHash && perUserSalt) {
    hash = perUserHash;
    salt = perUserSalt;
  } else {
    ({ hash, salt } = resolvePasswordHash(user.role));
  }
  if (!hash || !salt) return null;

  if (!verifyPassword(password, hash, salt)) return null;

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
  return !!process.env.VERCEL_ENV;
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
  // Sem AUTH_SECRET: o fallback dev ("dev-insecure") só é
  // permitido em ambiente local (sem VERCEL_ENV). Em qualquer deployment
  // Vercel (preview ou production) sem AUTH_SECRET, recusa — o secret
  // "dev-insecure" é público e forjável, não pode autenticar em deploy.
  if (process.env.VERCEL_ENV) return null;
  return verifySignedToken(token, "dev-insecure");
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