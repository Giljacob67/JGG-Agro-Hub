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

// ── Granular RBAC ──────────────────────────────────────────────────

export type Permission = "read" | "create" | "update" | "delete" | "export";

/**
 * Permission matrix per role and resource.
 * gestao has full access to everything.
 */
const PERMISSIONS: Record<AgroRole, Record<string, Permission[]>> = {
  gestao: {
    "*": ["read", "create", "update", "delete", "export"],
  },
  comercial: {
    leads: ["read", "create", "update", "delete"],
    accounts: ["read", "create", "update", "delete"],
    opportunities: ["read", "create", "update", "delete"],
    contacts: ["read", "create", "update", "delete"],
    properties: ["read", "create", "update"],
    activities: ["read", "create"],
    stats: ["read"],
    copilot: ["read"],
    knowledge: ["read"],
    audit: ["read"],
    email: ["read", "create"],
  },
  juridico: {
    matters: ["read", "create", "update", "delete"],
    tasks: ["read", "create", "update", "delete"],
    deadlines: ["read", "create", "update", "delete"],
    documents: ["read", "create", "update", "delete"],
    "document-checklist": ["read", "create", "update", "delete"],
    "time-entries": ["read", "create", "update"],
    contacts: ["read"],
    properties: ["read"],
    "opposing-parties": ["read", "create", "update"],
    activities: ["read", "create"],
    stats: ["read"],
    copilot: ["read"],
    knowledge: ["read"],
    audit: ["read"],
    email: ["read", "create"],
  },
};

/**
 * Check if a role can access a resource (legacy compatibility).
 */
export function roleCanAccess(role: AgroRole, resource: string): boolean {
  if (role === "gestao") return true;
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;
  return resource in rolePerms;
}

/**
 * Check if a role has a specific permission on a resource.
 */
export function hasPermission(
  role: AgroRole,
  resource: string,
  permission: Permission,
): boolean {
  // gestao has full access
  if (role === "gestao") return true;

  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;

  // Check exact resource match
  const resourcePerms = rolePerms[resource];
  if (resourcePerms) {
    return resourcePerms.includes(permission);
  }

  // Check wildcard
  const wildcardPerms = rolePerms["*"];
  if (wildcardPerms) {
    return wildcardPerms.includes(permission);
  }

  return false;
}

/**
 * Get all permissions for a role on a resource.
 */
export function getResourcePermissions(
  role: AgroRole,
  resource: string,
): Permission[] {
  if (role === "gestao") return ["read", "create", "update", "delete", "export"];
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return [];
  return rolePerms[resource] ?? rolePerms["*"] ?? [];
}

/**
 * Get all resources a role can access.
 */
export function getAccessibleResources(role: AgroRole): string[] {
  if (role === "gestao") return ["*"];
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return [];
  return Object.keys(rolePerms);
}