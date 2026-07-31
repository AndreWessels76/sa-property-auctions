import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "How to cancel SA Property Auctions subscriptions and when refunds may apply.",
};

export default function RefundsPage() {
  return (
    <LegalPageShell
      title="Refund & Cancellation Policy"
      subtitle="Cancel anytime via the billing portal. Refunds are limited and case-by-case."
    >
      <section>
        <h2>1. Cancellation</h2>
        <p>
          You may cancel a premium subscription at any time through the Stripe
          Customer Portal (linked from your{" "}
          <Link href="/profile">profile</Link>) or by contacting support. After
          cancellation, premium access typically continues until the end of the
          current paid period, then reverts to free.
        </p>
      </section>

      <section>
        <h2>2. Refunds</h2>
        <p>
          Except where required by South African consumer law, subscription fees
          are generally non-refundable once the billing period has started.
          We may consider goodwill refunds for duplicate charges, proven
          technical failures preventing access, or billing errors — contact{" "}
          <a href="mailto:info@sapropertyauctions.co.za">
            info@sapropertyauctions.co.za
          </a>{" "}
          within 14 days of the charge.
        </p>
      </section>

      <section>
        <h2>3. Chargebacks</h2>
        <p>
          Please contact us before initiating a chargeback so we can help. Fraud
          or abuse may result in account suspension.
        </p>
      </section>

      <section>
        <h2>4. Account deletion</h2>
        <p>
          Deleting your account does not automatically issue a refund for the
          current period. Cancel billing first if you wish to stop renewals.
          See <Link href="/profile">Delete Account</Link> and our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
