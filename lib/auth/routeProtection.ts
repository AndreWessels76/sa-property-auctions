export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/watchlist",
  "/alerts",
  "/profile",
  "/heatmaps",
] as const;

export const ADMIN_PREFIXES = ["/admin"] as const;

export function matchesPrefix(
  path: string,
  prefixes: readonly string[],
) {
  return prefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isProtectedPath(path: string) {
  return matchesPrefix(path, PROTECTED_PREFIXES);
}

export function isAdminPath(path: string) {
  return matchesPrefix(path, ADMIN_PREFIXES);
}

export function requiresAuthentication(path: string) {
  return isProtectedPath(path);
}
