import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Important disclaimers for auction data, AI features, and investment decisions on SA Property Auctions.",
};

export default function DisclaimerPage() {
  return (
    <LegalPageShell
      title="Disclaimer"
      subtitle="Auction listings and AI insights are informational only."
    >
      <section>
        <h2>1. Not an auctioneer or estate agent</h2>
        <p>
          SA Property Auctions is an information and alerts platform. We do not
          conduct auctions, take bids, hold deposits, transfer title, or act as
          your estate agent or attorney.
        </p>
      </section>

      <section>
        <h2>2. Auction information</h2>
        <p>
          Property details (prices, dates, status, images, addresses) are
          compiled from third-party sources and may change without notice.
          Always verify with the sheriff, bank, auctioneer, or conveyancer
          before acting. Past performance or estimated values are not
          guarantees.
        </p>
      </section>

      <section>
        <h2>3. No legal, financial, or investment advice</h2>
        <p>
          Content on this site does not constitute legal, tax, financial, or
          investment advice. Obtain independent professional advice before
          bidding or purchasing.
        </p>
      </section>

      <section>
        <h2>4. AI disclaimer</h2>
        <p>
          AI search and analysis features may misinterpret queries, miss
          listings, or produce incorrect summaries. Treat outputs as starting
          points only and verify against source listings and official notices.
        </p>
      </section>

      <section>
        <h2>5. Third-party links and services</h2>
        <p>
          We are not responsible for third-party websites, payment providers, or
          data sources linked from the platform.
        </p>
      </section>

      <section>
        <h2>6. Availability</h2>
        <p>
          We aim for high availability but do not warrant uninterrupted access.
          Maintenance and outages may occur.
        </p>
      </section>

      <section>
        <h2>7. Related documents</h2>
        <p>
          See also <Link href="/terms">Terms &amp; Conditions</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
