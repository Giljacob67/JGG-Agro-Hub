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