import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How SA Property Auctions collects, uses, and protects personal information under South African law.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="This policy explains how we handle personal information on the platform."
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          SA Property Auctions respects your privacy. This Privacy Policy
          should be read with our{" "}
          <Link href="/popia">POPIA Privacy Notice</Link> and{" "}
          <Link href="/cookies">Cookie Policy</Link>. We process personal
          information in accordance with the Protection of Personal Information
          Act 4 of 2013 (POPIA) and other applicable South African laws.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <ul>
          <li>
            Account data: name, email address, password (hashed by our auth
            provider), profile preferences.
          </li>
          <li>
            Subscription data: plan, status, and Stripe customer/subscription
            identifiers (payment card details are handled by Stripe — we do not
            store full card numbers).
          </li>
          <li>
            Usage data: searches, saved searches, alerts, watchlists,
            favourites (where stored), and diagnostic logs.
          </li>
          <li>
            Technical data: IP address, device/browser information, and
            cookies/similar technologies as described in the Cookie Policy.
          </li>
          <li>
            Support communications: messages you send via contact or privacy
            request forms.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <ul>
          <li>Provide and secure the platform and your account.</li>
          <li>Process subscriptions and billing via Stripe.</li>
          <li>Deliver alerts, AI search/analysis (premium), and saved preferences.</li>
          <li>Respond to support and privacy requests.</li>
          <li>Improve reliability, prevent abuse, and meet legal obligations.</li>
        </ul>
      </section>

      <section>
        <h2>4. Sharing</h2>
        <p>We share personal information only as needed with:</p>
        <ul>
          <li>Supabase (authentication and database hosting).</li>
          <li>Stripe (payments and customer portal).</li>
          <li>Hosting/CDN providers (e.g. Vercel) for application delivery.</li>
          <li>Professional advisers or authorities where required by law.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </section>

      <section>
        <h2>5. Retention</h2>
        <p>
          We retain account and transactional records for as long as your
          account is active and thereafter as required for legal, tax, dispute,
          or security purposes. You may request deletion as described below.
        </p>
      </section>

      <section>
        <h2>6. Your rights</h2>
        <p>
          Under POPIA you may request access, correction, deletion, or
          objection to certain processing. Use{" "}
          <Link href="/privacy-requests">Privacy Requests</Link>,{" "}
          <Link href="/profile">Export My Data</Link> / Delete Account on your
          profile, or email{" "}
          <a href="mailto:privacy@sapropertyauctions.co.za">
            privacy@sapropertyauctions.co.za
          </a>
          .
        </p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          We use industry-standard controls including encrypted transport
          (HTTPS), access controls, and role-based restrictions. No method of
          transmission or storage is perfectly secure.
        </p>
      </section>

      <section>
        <h2>8. Children</h2>
        <p>
          The service is intended for adults. We do not knowingly collect
          personal information from children under 18 without appropriate
          consent.
        </p>
      </section>

      <section>
        <h2>9. Changes</h2>
        <p>
          We may update this policy and will revise the &quot;Last updated&quot;
          date when we do.
        </p>
      </section>
    </LegalPageShell>
  );
}
