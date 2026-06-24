import { isDbEnabled } from "./db/client.js";

/** True quando rodando na Vercel em produção (espelha auth-server.ts). */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export type GuardResult = { ok: true } | { ok: false; status: number; message: string };

/**
 * Recursos efetivamente persistidos no banco (data-service roteia por
 * `isDbEnabled()`). Os demais recursos do handler escrevem apenas no
 * store em memória — em produção isso vive por instância serverless e
 * some no próximo cold start (perda silenciosa). Manter esta lista em
 * sincronia com os branches de DB de `data-service.ts`.
 */
const DB_BACKED_RESOURCES = new Set([
  "users",
  "leads",
  "lead-lists",
  "accounts",
  "opportunities",
  "matters",
  "tasks",
  "deadlines",
  "activities",
  "audit",
  "documents",
  "contacts",
  "properties",
  "invoices",
  "document-checklist",
  "time-entries",
  "fee-agreements",
  "opposing-parties",
  "knowledge",
  "meetings",
]);

/**
 * Bloqueia escritas memory-only em produção. Dois casos:
 * - Sem `DATABASE_URL`: nenhum recurso persiste → bloqueia tudo (503).
 * - Com banco, mas recurso **não** é DB-backed: a escrita iria para a
 *   memória e sumiria no próximo cold start → bloqueia por recurso (503)
 *   em vez de retornar 201 e perder o dado em silêncio.
 *
 * Em dev/preview (não-produção) tudo passa: o store em memória é o modo
 * de trabalho local esperado.
 */
export function assertWritableInProd(resource: string): GuardResult {
  if (!isProduction()) return { ok: true };

  if (!isDbEnabled()) {
    return {
      ok: false,
      status: 503,
      message: `Persistência de '${resource}' indisponível em produção sem banco configurado (DATABASE_URL ausente).`,
    };
  }

  if (!DB_BACKED_RESOURCES.has(resource)) {
    return {
      ok: false,
      status: 503,
      message: `Persistência de '${resource}' ainda não suportada em produção (apenas em memória). Gravação bloqueada para evitar perda silenciosa de dados.`,
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