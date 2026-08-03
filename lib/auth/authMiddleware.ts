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
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Admin gate: profiles.role = admin (preferred) or JWT app_metadata.role = admin.
 * Subscription / Stripe / billing MUST NOT grant or revoke admin.
 */
export async function enforceRouteProtection(
  request: NextRequest,
  user: User | null,
  response: NextResponse,
  supabase?: SupabaseClient,
) {
  const path = request.nextUrl.pathname;

  if (requiresAuthentication(path) && !isAuthenticated(user)) {
    const loginUrl = new URL(
      loginRedirectUrl(path),
      request.url,
    );

    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPath(path)) {
    let allowed = canAccessAdmin(user);

    if (!allowed && user && supabase) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      allowed = (data?.role ?? "").toString().trim().toLowerCase() === "admin";
    }

    if (!allowed) {
      const dashboardUrl = new URL(AUTH_ROUTES.unauthorized, request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}
