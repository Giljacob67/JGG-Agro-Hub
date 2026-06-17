import { isDbEnabled } from "./db/client.js";

/** True quando rodando na Vercel em produção (espelha auth-server.ts). */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export type GuardResult = { ok: true } | { ok: false; status: number; message: string };

/**
 * Bloqueia escritas memory-only em produção sem banco configurado.
 * Em produção sem DATABASE_URL, escritas vivem por instância serverless
 * (perda silenciosa). O guard torna o problema audível (503).
 */
export function assertWritableInProd(resource: string): GuardResult {
  if (isProduction() && !isDbEnabled()) {
    return {
      ok: false,
      status: 503,
      message: `Persistência de '${resource}' indisponível em produção sem banco configurado (DATABASE_URL ausente).`,
    };
  }
  return { ok: true };
}

/** Erro para callers diretos (data-service) que não passam por VercelResponse. */
export class WritableGuardError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "WritableGuardError";
    this.status = status;
  }
}