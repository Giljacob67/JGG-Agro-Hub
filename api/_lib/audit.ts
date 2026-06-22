/**
 * Audit logging system.
 * Records all CRUD operations with before/after state for compliance.
 *
 * Storage: In-memory (seed data). For production, migrate to Neon PostgreSQL.
 */

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
  metadata?: Record<string, unknown>;
}

// ── In-memory store ────────────────────────────────────────────────

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

// ── Public API ─────────────────────────────────────────────────────

export interface AuditContext {
  userId: string;
  userName: string;
  userRole: string;
}

/**
 * Log a create action.
 */
export function auditCreate(
  ctx: AuditContext,
  entityType: AuditEntityType,
  entity: Record<string, unknown>,
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId: ctx.userId,
    userName: ctx.userName,
    userRole: ctx.userRole,
    entityType,
    entityId: String(entity.id ?? ""),
    entityName: String(entity.name ?? entity.title ?? entity.id ?? ""),
    action: "create",
    before: null,
    after: entity,
    changes: [],
  };

  auditLogs.unshift(entry);
  if (auditLogs.length > MAX_LOGS) auditLogs.pop();

  return entry;
}

/**
 * Log an update action.
 */
export function auditUpdate(
  ctx: AuditContext,
  entityType: AuditEntityType,
  entityId: string,
  entityName: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): AuditLogEntry {
  const changes = computeChanges(before, after);

  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
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
  };

  auditLogs.unshift(entry);
  if (auditLogs.length > MAX_LOGS) auditLogs.pop();

  return entry;
}

/**
 * Log a delete action.
 */
export function auditDelete(
  ctx: AuditContext,
  entityType: AuditEntityType,
  entity: Record<string, unknown>,
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId: ctx.userId,
    userName: ctx.userName,
    userRole: ctx.userRole,
    entityType,
    entityId: String(entity.id ?? ""),
    entityName: String(entity.name ?? entity.title ?? entity.id ?? ""),
    action: "delete",
    before: entity,
    after: null,
    changes: [],
  };

  auditLogs.unshift(entry);
  if (auditLogs.length > MAX_LOGS) auditLogs.pop();

  return entry;
}

/**
 * Query audit logs with filters.
 */
export function queryAuditLogs(filters: {
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): { logs: AuditLogEntry[]; total: number } {
  let filtered = [...auditLogs];

  if (filters.entityType) {
    filtered = filtered.filter((l) => l.entityType === filters.entityType);
  }
  if (filters.entityId) {
    filtered = filtered.filter((l) => l.entityId === filters.entityId);
  }
  if (filters.userId) {
    filtered = filtered.filter((l) => l.userId === filters.userId);
  }
  if (filters.action) {
    filtered = filtered.filter((l) => l.action === filters.action);
  }
  if (filters.from) {
    filtered = filtered.filter((l) => l.timestamp >= filters.from!);
  }
  if (filters.to) {
    filtered = filtered.filter((l) => l.timestamp <= filters.to!);
  }

  const total = filtered.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;

  return {
    logs: filtered.slice(offset, offset + limit),
    total,
  };
}

/**
 * Get audit logs for a specific entity.
 */
export function getEntityAuditLogs(
  entityType: AuditEntityType,
  entityId: string,
): AuditLogEntry[] {
  return auditLogs.filter(
    (l) => l.entityType === entityType && l.entityId === entityId,
  );
}

/**
 * Export audit logs as CSV.
 */
export function exportAuditLogsCsv(
  logs: AuditLogEntry[],
): string {
  const headers = [
    "ID",
    "Data/Hora",
    "Usuário",
    "Perfil",
    "Entidade",
    "ID Entidade",
    "Nome Entidade",
    "Ação",
    "Alterações",
  ];

  const rows = logs.map((l) => [
    l.id,
    l.timestamp,
    l.userName,
    l.userRole,
    l.entityType,
    l.entityId,
    l.entityName,
    l.action,
    l.changes
      .map((c) => `${c.field}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`)
      .join("; "),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return csvContent;
}

/**
 * Get audit statistics.
 */
export function getAuditStats(): {
  totalLogs: number;
  byEntityType: Record<AuditEntityType, number>;
  byAction: Record<AuditAction, number>;
  recentActivity: AuditLogEntry[];
} {
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
