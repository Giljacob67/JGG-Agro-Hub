export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, string[]>;
}

export interface ListParamsBase extends PaginationParams {
  facets?: boolean;
}

export interface LeadListParams extends ListParamsBase {
  search?: string;
  status?: string;
  region?: string;
  source?: string;
  crop?: string;
  owner?: string;
  /** Filtra por lista de prospecção. `none` = sem lista. */
  listId?: string;
}

export interface AccountListParams extends ListParamsBase {
  search?: string;
  type?: string;
  region?: string;
  owner?: string;
}

export interface OpportunityListParams extends ListParamsBase {
  search?: string;
  stage?: string;
  practice?: string;
  owner?: string;
  priority?: string;
  valueRange?: string;
}

export interface MatterListParams extends ListParamsBase {
  search?: string;
  status?: string;
  risk?: string;
  practice?: string;
  owner?: string;
  deadline?: string;
}

export interface TaskListParams extends ListParamsBase {
  search?: string;
  status?: string;
  priority?: string;
  owner?: string;
  type?: string;
  due?: string;
}

export function normalizePagination(params: PaginationParams = {}) {
  const page = Math.max(1, Number(params.page) || DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(params.pageSize) || DEFAULT_PAGE_SIZE),
  );
  return { page, pageSize };
}

export function paginate<T>(
  items: T[],
  params: PaginationParams = {},
): PaginatedResult<T> {
  const { page, pageSize } = normalizePagination(params);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}