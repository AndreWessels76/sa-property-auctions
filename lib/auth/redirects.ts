export const AUTH_ROUTES = {
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  unauthorized: "/dashboard",
} as const;

export function loginRedirectUrl(nextPath: string) {
  const params = new URLSearchParams({
    next: nextPath,
  });

  return `${AUTH_ROUTES.login}?${params.toString()}`;
}

export function safeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return AUTH_ROUTES.dashboard;
  }

  return next;
}
