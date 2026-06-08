export const FILTER_ALL = "all";

export function uniqueSorted(
  values: Array<string | undefined | null>,
): string[] {
  const set = new Set<string>();
  for (const value of values) {
    if (value?.trim()) set.add(value.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function hasActiveFilters(
  filters: Record<string, string>,
  search?: string,
): boolean {
  if (search?.trim()) return true;
  return Object.values(filters).some((v) => v !== FILTER_ALL);
}

export function matchesValueRange(
  value: number,
  filterKey: string,
  ranges: Record<
    string,
    { min: number; max: number }
  >,
): boolean {
  if (filterKey === FILTER_ALL) return true;
  const range = ranges[filterKey];
  if (!range) return true;
  return value >= range.min && value < range.max;
}