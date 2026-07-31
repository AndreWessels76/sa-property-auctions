import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about SA Property Auctions.",
};

const faqs = [
  {
    q: "Is this a bidding platform?",
    a: "No. We help you discover and track auction listings. Bidding happens with the relevant sheriff, bank, or auctioneer.",
  },
  {
    q: "Are listings guaranteed accurate?",
    a: "Listings are aggregated from third parties and can change. Always verify dates, reserve prices, and conditions before acting.",
  },
  {
    q: "What is included in Premium?",
    a: "Premium unlocks AI search/analysis and higher usage limits. See Pricing for current plans. Billing is handled by Stripe.",
  },
  {
    q: "How do I cancel?",
    a: "Use Manage billing on your profile (Stripe Customer Portal) or contact support. See the Refund & Cancellation Policy.",
  },
  {
    q: "How do I delete my data?",
    a: "Sign in → Profile → Export my data or Delete account. You can also submit a Privacy Request.",
  },
  {
    q: "Do you use AI?",
    a: "Yes, for premium search and insights. AI outputs can be wrong — treat them as helpers, not advice. See the Disclaimer.",
  },
];

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-4xl font-bold text-navy-900">FAQ</h1>
          <p className="mt-3 text-slate-600">
            Quick answers for public beta. Still stuck?{" "}
            <Link href="/contact" className="font-medium text-navy-900 underline">
              Contact us
            </Link>
            .
          </p>
          <dl className="mt-10 space-y-8">
            {faqs.map((item) => (
              <div key={item.q}>
                <dt className="text-lg font-semibold text-navy-900">{item.q}</dt>
                <dd className="mt-2 text-slate-600 leading-relaxed">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>
      <Footer />
    </>
  );
}
