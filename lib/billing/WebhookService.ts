import {
  SubscriptionRepository,
  type SubscriptionPlan,
} from "@/lib/repositories/SubscriptionRepository";

function planFromPriceId(priceId: string): SubscriptionPlan {
  if (priceId === process.env.STRIPE_PRICE_YEARLY) {
    return "premium_yearly";
  }

  if (priceId === process.env.STRIPE_PRICE_MONTHLY) {
    return "premium_monthly";
  }

  throw new Error(`Unknown Stripe price id: ${priceId}`);
}

function periodEndIso(periodEnd: number) {
  return new Date(periodEnd * 1000).toISOString();
}

export class WebhookService {
  static async activateSubscription(
    userId: string,
    customerId: string,
    subscriptionId: string,
    priceId: string,
    expiresAt: string,
  ) {
    // Updates subscription fields only — never profiles.role (admin is independent).
    await SubscriptionRepository.activate({
      userId,
      customerId,
      subscriptionId,
      plan: planFromPriceId(priceId),
      expiresAt,
    });
  }

  static async cancelSubscription(customerId: string) {
    const userId =
      await SubscriptionRepository.findUserIdByCustomerId(customerId);

    if (!userId) {
      return;
    }

    await SubscriptionRepository.cancel(userId);
  }

  static async markPastDue(customerId: string) {
    const userId =
      await SubscriptionRepository.findUserIdByCustomerId(customerId);

    if (!userId) {
      return;
    }

    await SubscriptionRepository.markPastDue(userId);
  }

  static planFromPriceId(priceId: string) {
    return planFromPriceId(priceId);
  }

  static periodEndIso(periodEnd: number) {
    return periodEndIso(periodEnd);
  }
}
