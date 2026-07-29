export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function buildSearchResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): SearchResult<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}
