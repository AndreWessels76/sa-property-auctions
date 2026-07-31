import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "About",
  description:
    "About SA Property Auctions — South Africa's property auction discovery and alerts platform.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
            Company
          </p>
          <h1 className="mt-2 text-4xl font-bold text-navy-900">About us</h1>
          <div className="mt-8 space-y-5 text-slate-700 leading-relaxed">
            <p>
              SA Property Auctions helps South Africans discover sheriff, bank
              and public property auctions in one place. We combine searchable
              listings, alerts, and premium AI tools so investors and home
              seekers can act with better timing — not legal advice or bidding
              services.
            </p>
            <p>
              We are based in Johannesburg and operate under South African law,
              with POPIA-aligned privacy practices. Auction data is aggregated
              from trusted sources and may change; always verify before you bid.
            </p>
            <p>
              Learn more in our <Link className="underline" href="/faq">FAQ</Link>
              , <Link className="underline" href="/disclaimer">Disclaimer</Link>
              , or <Link className="underline" href="/contact">Contact</Link>{" "}
              the team.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
