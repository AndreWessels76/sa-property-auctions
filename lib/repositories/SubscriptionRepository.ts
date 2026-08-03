import { BaseRepository } from "./BaseRepository";
import type {
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/lib/subscription/types";

export type { SubscriptionPlan, SubscriptionStatus };

/**
 * Subscription persistence only.
 * NEVER updates profiles.role — admin/free/user roles are independent of Stripe.
 */
export class SubscriptionRepository extends BaseRepository {
  static async activate({
    userId,
    customerId,
    subscriptionId,
    plan,
    expiresAt,
  }: {
    userId: string;
    customerId: string;
    subscriptionId: string;
    plan: SubscriptionPlan;
    expiresAt: string;
  }) {
    const db = this.adminDb();

    const { error } = await db
      .from("profiles")
      .update({
        subscription_status: "active" satisfies SubscriptionStatus,
        subscription_plan: plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      this.handleError(
        "SubscriptionRepository.activate",
        error,
      );
    }
  }

  static async cancel(userId: string) {
    const db = this.adminDb();

    const { error } = await db
      .from("profiles")
      .update({
        subscription_status: "inactive" satisfies SubscriptionStatus,
        subscription_plan: "free" satisfies SubscriptionPlan,
        stripe_subscription_id: null,
        subscription_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      this.handleError(
        "SubscriptionRepository.cancel",
        error,
      );
    }
  }

  static async markPastDue(userId: string) {
    const db = this.adminDb();

    const { error } = await db
      .from("profiles")
      .update({
        // Revoke premium subscription status only; never touch profiles.role
        subscription_status: "past_due" satisfies SubscriptionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      this.handleError(
        "SubscriptionRepository.markPastDue",
        error,
      );
    }
  }

  static async findUserIdByCustomerId(customerId: string) {
    const db = this.adminDb();

    const { data, error } = await db
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (error) {
      this.handleError(
        "SubscriptionRepository.findUserIdByCustomerId",
        error,
      );
    }

    return data?.id ?? null;
  }

  static async get(userId: string) {
    const db = await this.db();

    const { data, error } = await db
      .from("profiles")
      .select(`
        subscription_status,
        subscription_plan,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_expires_at
      `)
      .eq("id", userId)
      .single();

    if (error) {
      this.handleError(
        "SubscriptionRepository.get",
        error,
      );
    }

    return data;
  }
}
