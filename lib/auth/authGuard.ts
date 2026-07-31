import type { User } from "@supabase/supabase-js";
import type { Role } from "@/lib/permissions/roles";
import { ROLES } from "@/lib/permissions/roles";

export function getUserRole(user: User | null | undefined): Role {
  if (!user) {
    return ROLES.guest;
  }

  // Only trust server-controlled app_metadata — never user_metadata (client-writable).
  const role = user.app_metadata?.role as Role | undefined;

  return role ?? ROLES.user;
}

export function isAuthenticated(user: User | null | undefined) {
  return Boolean(user);
}

export function isAdminUser(user: User | null | undefined) {
  return getUserRole(user) === ROLES.admin;
}

export function canAccessAdmin(user: User | null | undefined) {
  return isAuthenticated(user) && isAdminUser(user);
}
