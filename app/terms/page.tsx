import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and Conditions for SA Property Auctions — South African law, subscriptions, and acceptable use.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms & Conditions"
      subtitle="These Terms govern your use of the SA Property Auctions platform."
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          SA Property Auctions (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
          provides an online platform that aggregates and presents information
          about property auctions in the Republic of South Africa. These Terms
          are governed by the laws of South Africa.
        </p>
      </section>

      <section>
        <h2>2. Acceptance</h2>
        <p>
          By accessing or creating an account on the platform, you agree to
          these Terms, our{" "}
          <Link href="/privacy">Privacy Policy</Link>,{" "}
          <Link href="/popia">POPIA Privacy Notice</Link>, and related policies
          linked in the footer. If you do not agree, do not use the service.
        </p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <ul>
          <li>You must provide accurate registration information.</li>
          <li>You are responsible for safeguarding your credentials.</li>
          <li>
            You must be at least 18 years old, or use the service under
            parental/guardian supervision where permitted by law.
          </li>
          <li>
            We may suspend or terminate accounts that breach these Terms or
            applicable law.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Subscriptions and billing</h2>
        <p>
          Paid plans are billed through Stripe. Billing terms are set out in our{" "}
          <Link href="/subscription-policy">Subscription &amp; Billing Policy</Link>{" "}
          and{" "}
          <Link href="/refunds">Refund &amp; Cancellation Policy</Link>. Free
          accounts have limited features; premium features require an active
          subscription.
        </p>
      </section>

      <section>
        <h2>5. Auction information disclaimer</h2>
        <p>
          Listing data is sourced from third parties and may be incomplete,
          delayed, or inaccurate. We do not conduct auctions, sell properties,
          or guarantee sale outcomes. Always verify details with the relevant
          sheriff, bank, auctioneer, or legal advisor before bidding. See our{" "}
          <Link href="/disclaimer">Disclaimer</Link>.
        </p>
      </section>

      <section>
        <h2>6. Artificial intelligence features</h2>
        <p>
          AI-assisted search and analysis are tools to help explore listings.
          Outputs may be incorrect or incomplete and must not be treated as
          legal, financial, or investment advice. You remain responsible for
          your decisions.
        </p>
      </section>

      <section>
        <h2>7. Acceptable use</h2>
        <ul>
          <li>Do not scrape, overload, or reverse-engineer the platform.</li>
          <li>Do not attempt to bypass paywalls, rate limits, or security controls.</li>
          <li>Do not upload unlawful, harmful, or infringing content.</li>
          <li>Do not use the service for fraud or money laundering.</li>
        </ul>
      </section>

      <section>
        <h2>8. Intellectual property</h2>
        <p>
          Platform software, branding, and original content are owned by us or
          our licensors. Auction listing content may remain owned by its
          original publishers. You may not copy or redistribute our materials
          without permission, except as allowed by fair dealing under South
          African law.
        </p>
      </section>

      <section>
        <h2>9. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by South African law (including the
          Consumer Protection Act 68 of 2008 where applicable), we are not
          liable for losses arising from reliance on auction data, AI outputs,
          third-party services (including Stripe and hosting providers), or
          downtime. Nothing in these Terms excludes liability that cannot
          lawfully be excluded.
        </p>
      </section>

      <section>
        <h2>10. Privacy</h2>
        <p>
          Personal information is processed as described in our Privacy Policy
          and POPIA Privacy Notice. You may exercise data subject rights via{" "}
          <Link href="/privacy-requests">Privacy Requests</Link>.
        </p>
      </section>

      <section>
        <h2>11. Changes</h2>
        <p>
          We may update these Terms for legal, operational, or product reasons.
          Material changes will be reflected by updating the &quot;Last
          updated&quot; date. Continued use after changes constitutes
          acceptance.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          SA Property Auctions, Johannesburg, South Africa. Email:{" "}
          <a href="mailto:info@sapropertyauctions.co.za">
            info@sapropertyauctions.co.za
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
