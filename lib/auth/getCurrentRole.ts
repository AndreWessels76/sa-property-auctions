import { getCurrentProfile } from "./getCurrentProfile";
import type { Role } from "@/lib/permissions/roles";
import { ROLES } from "@/lib/permissions/roles";

function normalizeRole(raw: unknown): Role {
  const value = typeof raw === "string" ? raw : undefined;

  switch (value) {
    case "admin":
      return ROLES.admin;
    case "premium":
      return ROLES.premium;
    case "user":
      return ROLES.user;
    case "guest":
    case "free":
      return ROLES.guest;
    default:
      return ROLES.user;
  }
}

export async function getCurrentRole(): Promise<Role> {
  const profile = await getCurrentProfile();
  return normalizeRole(profile?.role);
}