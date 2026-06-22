/**
 * Audit logging system.
 * Registra CRUD com before/after + diff para compliance.
 *
 * Storage:
 *  - DB (Neon) quando `DATABASE_URL` ativo: `agro.audit_logs` com
 *    before_state/after_state/changes/ip/chain hash (sha256).
 *  - In-memory (dev/seed) quando sem DB.
 *
 * Chain hash: cada row carrega `hash = sha256(prev_hash || ":" || payload)`.
 * `prev_hash` = hash da row anterior (ou "" para a primeira). Garante
 * integridade append-only — remover/reordenar rows quebra a cadeia.
 */

import { createHash } from "node:crypto";
import { isDbEnabled } from "./db/client.js";
import {
  dbCreateAuditLogFull,
  dbQueryAuditLogs,
  dbGetAuditStats,
} from "./db/repository.js";

// ── Types ──────────────────────────────────────────────────────────

export type AuditEntityType =
  | "lead"
  | "account"
  | "opportunity"
  | "matter"
  | "task"
  | "deadline"
  | "activity"
  | "document"
  | "document-checklist"
  | "time-entry"
  | "invoice"
  | "fee-agreement"
  | "contact"
  | "property"
  | "opposing-party"
  | "tax-obligation"
  | "environmental-license"
  | "credit-instrument"
  | "crop-season";

export type AuditAction = "create" | "update" | "delete";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  ip?: string | null;
  prevHash?: string | null;
  hash?: string | null;
  metadata?: Record<string, unknown>;
}

// ── In-memory store (fallback dev/sem DB) ─────────────────────────

const auditLogs: AuditLogEntry[] = [];
const MAX_LOGS = 10000;

let nextId = 1;
function generateId(): string {
  return `audit-${Date.now()}-${(nextId++).toString(36).padStart(4, "0")}`;
}

// ── Diff utility ───────────────────────────────────────────────────

function computeChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  if (!before || !after) return [];
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (key === "updatedAt" || key === "createdAt") continue;
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal ?? null, newValue: newVal ?? null });
    }
  }
  return changes;
}

// ── Chain hash ─────────────────────────────────────────────────────

function chainHash(prevHash: string | null, payload: Record<string, unknown>): string {
  const h = createHash("sha256");
  h.update(`${prevHash ?? ""}:${JSON.stringify(payload)}`);
  return h.digest("hex");
}

function payloadForHash(entry: {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  timestamp: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}): Record<string, unknown> {
  return {
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityName: entry.entityName,
    timestamp: entry.timestamp,
    before: entry.before,
    after: entry.after,
  };
}

// ── Public API ─────────────────────────────────────────────────────

export interface AuditContext {
  userId: string;
  userName: string;
  userRole: string;
}

export interface AuditOpts {
  ip?: string | null;
}

/**
 * Log a create action. Persiste no DB quando habilitado; senão in-memory.
 */
export async function auditCreate(
  ctx: AuditContext,
  entityType: AuditEntityType,
  entity: Record<string, unknown>,
  opts?: AuditOpts,
): Promise<AuditLogEntry> {
  const timestamp = new Date().toISOString();
  const entityId = String(entity.id ?? "");
  const entityName = String(entity.name ?? entity.title ?? entity.id ?? "");
  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp,
    userId: ctx.userId,
    userName: ctx.userName,
    userRole: ctx.userRole,
    entityType,
    entityId,
    entityName,
    action: "create",
    before: null,
    after: entity,
    changes: [],
    ip: opts?.ip ?? null,
  };

  if (isDbEnabled()) {
    const prevHash = await lastHash();
    entry.prevHash = prevHash;
    entry.hash = chainHash(prevHash, payloadForHash(entry));
    await dbCreateAuditLogFull({
      actorId: ctx.userId,
      actorName: ctx.userName,
      actorRole: ctx.userRole,
      action: "create",
      entityType,
      entityId,
      entityName,
      beforeState: null,
      afterState: entity,
      changes: [],
      ip: opts?.ip ?? null,
      prevHash,
      hash: entry.hash,
    });
  } else {
    auditLogs.unshift(entry);
    if (auditLogs.length > MAX_LOGS) auditLogs.pop();
  }

  return entry;
}

/**
 * Log an update action.
 */
export async function auditUpdate(
  ctx: AuditContext,
  entityType: AuditEntityType,
  entityId: string,
  entityName: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  opts?: AuditOpts,
): Promise<AuditLogEntry> {
  const changes = computeChanges(before, after);
  const timestamp = new Date().toISOString();
  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp,
    userId: ctx.userId,
    userName: ctx.userName,
    userRole: ctx.userRole,
    entityType,
    entityId,
    entityName,
    action: "update",
    before,
    after,
    changes,
    ip: opts?.ip ?? null,
  };

  if (isDbEnabled()) {
    const prevHash = await lastHash();
    entry.prevHash = prevHash;
    entry.hash = chainHash(prevHash, payloadForHash(entry));
    await dbCreateAuditLogFull({
      actorId: ctx.userId,
      actorName: ctx.userName,
      actorRole: ctx.userRole,
      action: "update",
      entityType,
      entityId,
      entityName,
      beforeState: before,
      afterState: after,
      changes,
      ip: opts?.ip ?? null,
      prevHash,
      hash: entry.hash,
    });
  } else {
    auditLogs.unshift(entry);
    if (auditLogs.length > MAX_LOGS) auditLogs.pop();
  }

  return entry;
}

/**
 * Log a delete action.
 */
export async function auditDelete(
  ctx: AuditContext,
  entityType: AuditEntityType,
  entity: Record<string, unknown>,
  opts?: AuditOpts,
): Promise<AuditLogEntry> {
  const timestamp = new Date().toISOString();
  const entityId = String(entity.id ?? "");
  const entityName = String(entity.name ?? entity.title ?? entity.id ?? "");
  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp,
    userId: ctx.userId,
    userName: ctx.userName,
    userRole: ctx.userRole,
    entityType,
    entityId,
    entityName,
    action: "delete",
    before: entity,
    after: null,
    changes: [],
    ip: opts?.ip ?? null,
  };

  if (isDbEnabled()) {
    const prevHash = await lastHash();
    entry.prevHash = prevHash;
    entry.hash = chainHash(prevHash, payloadForHash(entry));
    await dbCreateAuditLogFull({
      actorId: ctx.userId,
      actorName: ctx.userName,
      actorRole: ctx.userRole,
      action: "delete",
      entityType,
      entityId,
      entityName,
      beforeState: entity,
      afterState: null,
      changes: [],
      ip: opts?.ip ?? null,
      prevHash,
      hash: entry.hash,
    });
  } else {
    auditLogs.unshift(entry);
    if (auditLogs.length > MAX_LOGS) auditLogs.pop();
  }

  return entry;
}

/**
 * Hash da última row de audit (DB) — para a chain hash. "" se vazio.
 */
async function lastHash(): Promise<string> {
  const sql = (await import("./db/client.js")).getSql();
  const rows = await sql`SELECT hash FROM agro.audit_logs WHERE hash IS NOT NULL ORDER BY id DESC LIMIT 1`;
  return (rows[0]?.hash as string | undefined) ?? "";
}

// ── Query ──────────────────────────────────────────────────────────

export interface AuditQueryFilters {
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Query audit logs com filtros. DB quando habilitado; senão in-memory.
 */
export async function queryAuditLogs(
  filters: AuditQueryFilters,
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  if (isDbEnabled()) {
    const r = await dbQueryAuditLogs(filters);
    return { logs: r.logs as unknown as AuditLogEntry[], total: r.total };
  }

  let filtered = [...auditLogs];
  if (filters.entityType) filtered = filtered.filter((l) => l.entityType === filters.entityType);
  if (filters.entityId) filtered = filtered.filter((l) => l.entityId === filters.entityId);
  if (filters.userId) filtered = filtered.filter((l) => l.userId === filters.userId);
  if (filters.action) filtered = filtered.filter((l) => l.action === filters.action);
  if (filters.from) filtered = filtered.filter((l) => l.timestamp >= filters.from!);
  if (filters.to) filtered = filtered.filter((l) => l.timestamp <= filters.to!);

  const total = filtered.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;
  return { logs: filtered.slice(offset, offset + limit), total };
}

/**
 * Audit logs de uma entidade específica.
 */
export async function getEntityAuditLogs(
  entityType: AuditEntityType,
  entityId: string,
): Promise<AuditLogEntry[]> {
  const { logs } = await queryAuditLogs({ entityType, entityId, limit: 1000 });
  return logs;
}

/**
 * Export audit logs como CSV.
 */
export function exportAuditLogsCsv(logs: AuditLogEntry[]): string {
  const headers = [
    "ID", "Data/Hora", "Usuário", "Perfil", "Entidade",
    "ID Entidade", "Nome Entidade", "Ação", "Alterações", "IP", "Hash",
  ];
  const rows = logs.map((l) => [
    l.id, l.timestamp, l.userName, l.userRole, l.entityType,
    l.entityId, l.entityName, l.action,
    l.changes
      .map((c) => `${c.field}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`)
      .join("; "),
    l.ip ?? "",
    l.hash ?? "",
  ]);
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/**
 * Estatísticas de audit. DB quando habilitado; senão in-memory.
 */
export async function getAuditStats(): Promise<{
  totalLogs: number;
  byEntityType: Record<AuditEntityType, number>;
  byAction: Record<AuditAction, number>;
  recentActivity: AuditLogEntry[];
}> {
  if (isDbEnabled()) {
    const r = await dbGetAuditStats();
    return {
      totalLogs: r.totalLogs,
      byEntityType: r.byEntityType as Record<AuditEntityType, number>,
      byAction: r.byAction as Record<AuditAction, number>,
      recentActivity: r.recentActivity as unknown as AuditLogEntry[],
    };
  }

  const byEntityType: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  for (const log of auditLogs) {
    byEntityType[log.entityType] = (byEntityType[log.entityType] ?? 0) + 1;
    byAction[log.action] = (byAction[log.action] ?? 0) + 1;
  }
  return {
    totalLogs: auditLogs.length,
    byEntityType: byEntityType as Record<AuditEntityType, number>,
    byAction: byAction as Record<AuditAction, number>,
    recentActivity: auditLogs.slice(0, 10),
  };
}