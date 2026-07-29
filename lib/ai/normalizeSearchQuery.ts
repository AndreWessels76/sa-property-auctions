export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/^["'`]+/, "")
    .replace(/["'`]+$/, "")
    .trim();
}
