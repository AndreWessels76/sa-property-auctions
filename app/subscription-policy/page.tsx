import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Subscription & Billing Policy",
  description:
    "How SA Property Auctions subscriptions, Stripe billing, and plan changes work.",
};

export default function SubscriptionPolicyPage() {
  return (
    <LegalPageShell
      title="Subscription & Billing Policy"
      subtitle="Paid access is provided via Stripe-managed subscriptions."
    >
      <section>
        <h2>1. Plans</h2>
        <p>
          We offer free and premium plans. Premium unlocks features such as AI
          search/analysis and expanded usage limits as described on{" "}
          <Link href="/pricing">Pricing</Link>. Plan details may change; the
          pricing page reflects current offers.
        </p>
      </section>

      <section>
        <h2>2. Stripe</h2>
        <p>
          Payments are processed by Stripe. By starting checkout you also agree
          to Stripe&apos;s terms. We do not store full payment card numbers on
          our servers. Billing history and payment methods can be managed via
          the Stripe Customer Portal from your profile when available.
        </p>
      </section>

      <section>
        <h2>3. Billing cycle</h2>
        <ul>
          <li>Monthly plans renew each month until cancelled.</li>
          <li>Yearly plans renew each year until cancelled.</li>
          <li>
            Prices are shown in the currency presented at checkout (typically
            South African Rand where configured).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Failed payments</h2>
        <p>
          If a renewal payment fails, premium access may be suspended or
          downgraded until payment succeeds. Update your payment method via the
          billing portal.
        </p>
      </section>

      <section>
        <h2>5. Taxes</h2>
        <p>
          Applicable taxes (including VAT where required) may be added as
          configured in Stripe and shown at checkout.
        </p>
      </section>

      <section>
        <h2>6. Related policies</h2>
        <p>
          Cancellation and refunds are governed by our{" "}
          <Link href="/refunds">Refund &amp; Cancellation Policy</Link>. General
          use is governed by our <Link href="/terms">Terms &amp; Conditions</Link>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
