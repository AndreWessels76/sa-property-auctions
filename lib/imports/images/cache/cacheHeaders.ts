export function buildCacheHeaders(maxAge: number) {
  return {
    "Cache-Control": `public, max-age=${maxAge}, immutable`,
  };
}
