import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "POPIA Privacy Notice",
  description:
    "POPIA privacy notice for SA Property Auctions — responsible party, purposes, and data subject rights.",
};

export default function PopiaPage() {
  return (
    <LegalPageShell
      title="POPIA Privacy Notice"
      subtitle="Notice under the Protection of Personal Information Act 4 of 2013."
    >
      <section>
        <h2>1. Responsible party</h2>
        <p>
          SA Property Auctions, Johannesburg, South Africa, is the responsible
          party for personal information processed through this platform.
          Contact:{" "}
          <a href="mailto:privacy@sapropertyauctions.co.za">
            privacy@sapropertyauctions.co.za
          </a>
          .
        </p>
      </section>

      <section>
        <h2>2. Purpose of processing</h2>
        <p>We process personal information to:</p>
        <ul>
          <li>Register and authenticate users.</li>
          <li>Provide auction discovery, alerts, and premium AI features.</li>
          <li>Bill and manage subscriptions via Stripe.</li>
          <li>Provide support and respond to privacy requests.</li>
          <li>Secure the platform and comply with law.</li>
        </ul>
      </section>

      <section>
        <h2>3. Categories of information</h2>
        <p>
          Identity and contact details; account and subscription metadata;
          usage and preference data; technical logs; and communications you
          send to us. Special personal information is not intentionally
          collected.
        </p>
      </section>

      <section>
        <h2>4. Legal bases / justifications</h2>
        <ul>
          <li>Contractual necessity to provide the service you request.</li>
          <li>Legitimate interests in securing and improving the platform.</li>
          <li>Consent where required (e.g. certain cookies or optional marketing).</li>
          <li>Legal obligations (tax, dispute, regulatory requests).</li>
        </ul>
      </section>

      <section>
        <h2>5. Operators and cross-border transfers</h2>
        <p>
          We use operators such as Supabase, Stripe, and hosting providers. Some
          processing may occur outside South Africa. We take reasonable steps to
          ensure an adequate level of protection consistent with POPIA.
        </p>
      </section>

      <section>
        <h2>6. Data subject rights</h2>
        <p>You may request:</p>
        <ul>
          <li>Confirmation whether we hold your personal information.</li>
          <li>Access to or a copy of your personal information.</li>
          <li>Correction of inaccurate information.</li>
          <li>Deletion or destruction where appropriate.</li>
          <li>Objection to certain processing.</li>
          <li>Complaint to the Information Regulator (South Africa).</li>
        </ul>
        <p>
          Submit requests via{" "}
          <Link href="/privacy-requests">Privacy Requests</Link> or your{" "}
          <Link href="/profile">profile</Link> (export / delete). We may need
          to verify your identity before acting.
        </p>
      </section>

      <section>
        <h2>7. Complaints</h2>
        <p>
          Information Regulator (South Africa):{" "}
          <a
            href="https://inforegulator.org.za"
            target="_blank"
            rel="noopener noreferrer"
          >
            inforegulator.org.za
          </a>
          . Please contact us first so we can try to resolve your concern.
        </p>
      </section>
    </LegalPageShell>
  );
}
