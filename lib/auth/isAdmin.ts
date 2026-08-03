import { getCurrentProfile } from "./getCurrentProfile";
import { fromDatabaseRole } from "./profileRole";
import { ROLES } from "@/lib/permissions/roles";

/**
 * Admin authorization is role-only (profiles.role).
 * Never infer admin from subscription, Stripe, or billing state.
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return fromDatabaseRole(profile?.role) === ROLES.admin;
}
