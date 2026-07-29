import { NextResponse, type NextRequest } from "next/server";
import {
  canAccessAdmin,
  isAuthenticated,
} from "@/lib/auth/authGuard";
import { loginRedirectUrl, AUTH_ROUTES } from "@/lib/auth/redirects";
import {
  isAdminPath,
  requiresAuthentication,
} from "@/lib/auth/routeProtection";
import type { User } from "@supabase/supabase-js";

export function enforceRouteProtection(
  request: NextRequest,
  user: User | null,
  response: NextResponse,
) {
  const path = request.nextUrl.pathname;

  if (requiresAuthentication(path) && !isAuthenticated(user)) {
    const loginUrl = new URL(
      loginRedirectUrl(path),
      request.url,
    );

    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPath(path) && !canAccessAdmin(user)) {
    const dashboardUrl = new URL(AUTH_ROUTES.unauthorized, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
