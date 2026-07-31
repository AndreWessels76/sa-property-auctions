export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function buildSearchResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): SearchResult<T> {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}
