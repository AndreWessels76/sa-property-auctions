import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/billing/StripeClient";
import { WebhookService } from "@/lib/billing/WebhookService";
import { SubscriptionRepository } from "@/lib/repositories/SubscriptionRepository";
import { LoggerService } from "@/lib/logger";

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0] as
    | { current_period_end?: number }
    | undefined;

  const periodEnd =
    item?.current_period_end ??
    (subscription as { current_period_end?: number }).current_period_end;

  if (!periodEnd) {
    // Fallback: 30 days from now if Stripe payload shape differs
    return WebhookService.periodEndIso(
      Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    );
  }

  return WebhookService.periodEndIso(periodEnd);
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const body = await req.text();
  const signature =
    (await headers()).get("stripe-signature") ?? "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new NextResponse("Invalid signature", {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const userId =
          session.metadata?.userId ??
          session.client_reference_id ??
          undefined;

        if (!userId || !session.subscription || !session.customer) {
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );

        const item = subscription.items.data[0];

        await WebhookService.activateSubscription(
          userId,
          session.customer as string,
          subscription.id,
          item.price.id,
          subscriptionPeriodEnd(subscription),
        );

        break;
      }

      case "customer.subscription.updated": {
        const subscription =
          event.data.object as Stripe.Subscription;

        const userId =
          subscription.metadata?.userId ||
          (await SubscriptionRepository.findUserIdByCustomerId(
            subscription.customer as string,
          ));

        if (!userId) {
          break;
        }

        if (
          subscription.status === "active" ||
          subscription.status === "trialing"
        ) {
          const item = subscription.items.data[0];

          await WebhookService.activateSubscription(
            userId,
            subscription.customer as string,
            subscription.id,
            item.price.id,
            subscriptionPeriodEnd(subscription),
          );
        } else if (subscription.status === "past_due") {
          await WebhookService.markPastDue(
            subscription.customer as string,
          );
        } else if (
          subscription.status === "canceled" ||
          subscription.status === "unpaid"
        ) {
          await WebhookService.cancelSubscription(
            subscription.customer as string,
          );
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as Stripe.Subscription;

        await WebhookService.cancelSubscription(
          subscription.customer as string,
        );

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          await WebhookService.markPastDue(customerId);
        }

        break;
      }
    }
  } catch (error) {
    LoggerService.error("Stripe webhook handler failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
