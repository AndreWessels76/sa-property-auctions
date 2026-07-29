import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  if (!stripe) {
    const secret = process.env.STRIPE_SECRET_KEY;

    if (!secret) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    stripe = new Stripe(secret, {
      apiVersion: "2026-06-24.dahlia",
    });
  }

  return stripe;
}
