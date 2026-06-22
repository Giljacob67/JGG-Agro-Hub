export function parseStringArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function toJsonArray(value: string[] | undefined): string | null {
  if (!value?.length) return null;
  return JSON.stringify(value);
}

/** Lê JSONB (já-parseado pelo driver) ou string JSON, com fallback. */
export function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

/** Serializa qualquer valor para coluna JSONB (text→jsonb no INSERT). */
export function toJsonValue(value: unknown): string {
  return JSON.stringify(value ?? null);
}