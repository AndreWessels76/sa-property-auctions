import { BaseRepository } from "./BaseRepository";

/**
 * Stripe customer / subscription id helpers on profiles.
 * Prefer SubscriptionRepository.activate/cancel for entitlement changes.
 */
export class BillingRepository extends BaseRepository {
  static async updateStripeCustomer(
    userId: string,
    customerId: string,
  ) {
    const db = this.adminDb();

    const { error } = await db
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      this.handleError(
        "BillingRepository.updateStripeCustomer",
        error,
      );
    }
  }

  static async updateSubscription(
    userId: string,
    subscriptionId: string,
  ) {
    const db = this.adminDb();

    const { error } = await db
      .from("profiles")
      .update({
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      this.handleError(
        "BillingRepository.updateSubscription",
        error,
      );
    }
  }
}
