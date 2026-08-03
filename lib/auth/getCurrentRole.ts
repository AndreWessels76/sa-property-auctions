import { getCurrentProfile } from "./getCurrentProfile";
import type { Role } from "@/lib/permissions/roles";
import { fromDatabaseRole } from "./profileRole";

/**
 * Application role from profiles.role only.
 * Independent of subscription_status / Stripe.
 */
export async function getCurrentRole(): Promise<Role> {
  const profile = await getCurrentProfile();
  return fromDatabaseRole(profile?.role);
}
