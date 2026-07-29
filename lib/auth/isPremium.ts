import { getCurrentProfile } from "./getCurrentProfile";
import { ROLES } from "@/lib/permissions/roles";
import {
  isPremiumStatus,
  normalizeSubscription,
} from "@/lib/subscription";

export async function isPremium(): Promise<boolean> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return false;
  }

  // Admins retain full access. Paid access is status-driven only.
  if (profile.role === ROLES.admin) {
    return true;
  }

  return isPremiumStatus(normalizeSubscription(profile.subscription_status));
}
