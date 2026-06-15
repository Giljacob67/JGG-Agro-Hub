import type { AgroRole, AgroUser } from "./types.js";

interface AuthUserRecord extends AgroUser {
  password: string;
}

/**
 * Autenticação legada para DX no browser (local-handlers).
 * Em produção a API usa api/_lib/auth-server.ts (scrypt + HMAC).
 */
const DEV_PASSWORD = "jgg-agro-dev";

const USERS: AuthUserRecord[] = [
  {
    id: "usr-1",
    email: "agro@jgggroup.com.br",
    name: "Ana Ribeiro",
    role: "gestao",
    password: DEV_PASSWORD,
  },
  {
    id: "usr-2",
    email: "comercial@jgggroup.com.br",
    name: "Carlos Mendes",
    role: "comercial",
    password: DEV_PASSWORD,
  },
  {
    id: "usr-3",
    email: "juridico@jgggroup.com.br",
    name: "Equipe Jurídica Agro",
    role: "juridico",
    password: DEV_PASSWORD,
  },
];

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenPayload extends AgroUser {
  exp: number;
}

function encodeToken(user: AgroUser): string {
  const payload: TokenPayload = { ...user, exp: Date.now() + TOKEN_TTL_MS };
  return btoa(JSON.stringify(payload));
}

function decodeToken(token: string): AgroUser | null {
  try {
    const payload = JSON.parse(atob(token)) as TokenPayload;
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

export function authenticate(
  email: string,
  password: string,
): { token: string; user: AgroUser } | null {
  const user = USERS.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!user) return null;

  const publicUser: AgroUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  const token = encodeToken(publicUser);
  return { token, user: publicUser };
}

export function resolveSession(token: string | undefined): AgroUser | null {
  if (!token) return null;
  return decodeToken(token);
}

export function revokeSession() {
  /* Stateless — logout apenas no cliente. */
}

export function roleCanAccess(role: AgroRole, resource: string): boolean {
  if (role === "gestao") return true;
  if (role === "comercial") {
    return [
      "leads",
      "accounts",
      "opportunities",
      "activities",
      "stats",
      "crm",
      "copilot",
      "knowledge",
    ].includes(resource);
  }
  if (role === "juridico") {
    return [
      "matters",
      "tasks",
      "deadlines",
      "activities",
      "stats",
      "crm",
      "copilot",
      "knowledge",
    ].includes(resource);
  }
  return false;
}