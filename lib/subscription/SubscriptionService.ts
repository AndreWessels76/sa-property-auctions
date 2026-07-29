import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { ROLES } from "@/lib/permissions/roles";
import { SubscriptionRepository } from "@/lib/repositories/SubscriptionRepository";
import { SubscriptionPlans } from "@/lib/subscription/plans";
import {
  isPremiumStatus,
  normalizeSubscription,
  SUBSCRIPTIONS,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type UserSubscription,
} from "@/lib/subscription/types";

export class SubscriptionService {
  static readonly STATUSES = SUBSCRIPTIONS;

  static async get(userId: string) {
    return SubscriptionRepository.get(userId);
  }

  static async getForCurrentUser(): Promise<UserSubscription | null> {
    const profile = await getCurrentProfile();

    if (!profile) {
      return null;
    }

    const row = await SubscriptionRepository.get(profile.id).catch(() => null);

    return {
      plan: (row?.subscription_plan as SubscriptionPlan | undefined) ?? "free",
      status: normalizeSubscription(
        row?.subscription_status ?? profile.subscription_status,
      ),
      expiresAt: row?.subscription_expires_at ?? null,
      customerId: row?.stripe_customer_id ?? null,
      subscriptionId: row?.stripe_subscription_id ?? null,
    };
  }

  static async subscription(): Promise<SubscriptionStatus> {
    const profile = await getCurrentProfile();
    return normalizeSubscription(profile?.subscription_status);
  }

  static async isActive(): Promise<boolean> {
    return isPremiumStatus(await this.subscription());
  }

  static async premium(): Promise<boolean> {
    const profile = await getCurrentProfile();

    if (!profile) {
      return false;
    }

    // Admins retain full access. Premium is subscription-status only —
    // never grant access from a stale profiles.role = "premium".
    if (profile.role === ROLES.admin) {
      return true;
    }

    return isPremiumStatus(
      normalizeSubscription(profile.subscription_status),
    );
  }

  static async requirePremium(): Promise<void> {
    const premium = await this.premium();

    if (!premium) {
      throw new Error("Premium subscription required");
    }
  }

  static async isPremium(userId: string): Promise<boolean> {
    const subscription = await this.get(userId).catch(() => null);

    return (
      isPremiumStatus(
        normalizeSubscription(subscription?.subscription_status),
      ) && subscription?.subscription_plan !== "free"
    );
  }

  static planLimits(plan: SubscriptionPlan | string | null | undefined) {
    switch (plan) {
      case "premium_monthly":
        return SubscriptionPlans.PREMIUM_MONTHLY;
      case "premium_yearly":
        return SubscriptionPlans.PREMIUM_YEARLY;
      default:
        return SubscriptionPlans.FREE;
    }
  }
}
