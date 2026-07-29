import { getStripe } from "./StripeClient";
import type {
  BillingInterval,
  BillingPortalResponse,
  CheckoutResponse,
} from "./BillingTypes";
import { SubscriptionRepository } from "@/lib/repositories/SubscriptionRepository";

const MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_MONTHLY!;
const YEARLY_PRICE_ID = process.env.STRIPE_PRICE_YEARLY!;

function priceIdForInterval(interval: BillingInterval) {
  const priceId =
    interval === "monthly" ? MONTHLY_PRICE_ID : YEARLY_PRICE_ID;

  if (!priceId) {
    throw new Error(
      interval === "monthly"
        ? "Missing STRIPE_PRICE_MONTHLY"
        : "Missing STRIPE_PRICE_YEARLY",
    );
  }

  return priceId;
}

export class CheckoutService {
  static async createCheckout({
    userId,
    email,
    interval,
    customerId,
  }: {
    userId: string;
    email: string;
    interval: BillingInterval;
    customerId?: string | null;
  }): Promise<CheckoutResponse> {
    const stripe = getStripe();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      throw new Error("Missing NEXT_PUBLIC_SITE_URL");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(customerId
        ? { customer: customerId }
        : { customer_email: email }),
      success_url: `${siteUrl}/billing/success`,
      cancel_url: `${siteUrl}/pricing`,
      client_reference_id: userId,
      metadata: {
        userId,
        interval,
      },
      subscription_data: {
        metadata: {
          userId,
          interval,
        },
      },
      line_items: [
        {
          price: priceIdForInterval(interval),
          quantity: 1,
        },
      ],
    });

    if (!session.url) {
      throw new Error("Stripe checkout session missing URL");
    }

    return { url: session.url };
  }

  static async createPortalSession(
    customerId: string,
  ): Promise<BillingPortalResponse> {
    const stripe = getStripe();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      throw new Error("Missing NEXT_PUBLIC_SITE_URL");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/profile`,
    });

    return { url: session.url };
  }
}

export class BillingService {
  static async startCheckout(
    userId: string,
    email: string,
    interval: BillingInterval,
  ) {
    const subscription = await SubscriptionRepository.get(userId).catch(
      () => null,
    );

    return CheckoutService.createCheckout({
      userId,
      email,
      interval,
      customerId: subscription?.stripe_customer_id,
    });
  }

  static async openPortal(userId: string) {
    const subscription = await SubscriptionRepository.get(userId);

    if (!subscription?.stripe_customer_id) {
      throw new Error("No Stripe customer found for this account");
    }

    return CheckoutService.createPortalSession(
      subscription.stripe_customer_id,
    );
  }
}
