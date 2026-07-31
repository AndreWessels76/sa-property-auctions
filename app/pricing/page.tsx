import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui";
import PricingCheckoutButtons from "./PricingCheckoutButtons";
import {
  FREE_FEATURES,
  PREMIUM_FEATURES,
  PUBLIC_PRICING,
  formatZar,
  yearlySavingsZar,
} from "@/lib/billing/publicPricing";

export const metadata = {
  title: "Pricing",
  description:
    "SA Property Auctions Premium from R99/month or R990/year. Unlock AI search, alerts and analytics.",
};

export default function PricingPage() {
  const savings = yearlySavingsZar();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="mb-10 max-w-2xl">
            <h1 className="text-4xl font-bold text-navy-900">Pricing</h1>
            <p className="mt-3 text-slate-600">
              Start free, then upgrade for AI search, unlimited alerts and
              premium analytics. Prices shown in South African Rand. Cancel
              anytime via the billing portal.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Free
              </p>
              <h2 className="mt-2 text-2xl font-bold text-navy-900">R0</h2>
              <p className="mt-1 text-sm text-slate-500">Forever free basics</p>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                {FREE_FEATURES.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50"
              >
                Create free account
              </Link>
            </Card>

            <Card>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Premium Monthly
              </p>
              <h2 className="mt-2 text-3xl font-bold text-navy-900">
                {PUBLIC_PRICING.monthly.display}
                <span className="text-base font-medium text-slate-500">
                  {" "}
                  / month
                </span>
              </h2>
              <p className="mt-2 text-slate-500">
                Billed monthly in ZAR via Stripe. Cancel anytime.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                {PREMIUM_FEATURES.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <PricingCheckoutButtons interval="monthly" />
            </Card>

            <Card className="border-gold-400/60 bg-gold-50/40">
              <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">
                Premium Yearly — best value
              </p>
              <h2 className="mt-2 text-3xl font-bold text-navy-900">
                {PUBLIC_PRICING.yearly.display}
                <span className="text-base font-medium text-slate-500">
                  {" "}
                  / year
                </span>
              </h2>
              <p className="mt-2 text-slate-600">
                Save {formatZar(savings)} versus paying monthly (
                {formatZar(PUBLIC_PRICING.monthly.amountZar * 12)}/year).
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                {PREMIUM_FEATURES.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <PricingCheckoutButtons interval="yearly" />
            </Card>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Already subscribed?{" "}
            <Link href="/profile" className="font-medium text-navy-900 underline">
              Manage your account
            </Link>
          </p>

          <p className="mt-4 max-w-2xl text-sm text-slate-500">
            By checking out you agree to our{" "}
            <Link href="/terms" className="font-medium text-navy-900 underline">
              Terms
            </Link>
            ,{" "}
            <Link href="/privacy" className="font-medium text-navy-900 underline">
              Privacy Policy
            </Link>
            ,{" "}
            <Link
              href="/subscription-policy"
              className="font-medium text-navy-900 underline"
            >
              Subscription &amp; Billing Policy
            </Link>
            , and{" "}
            <Link href="/refunds" className="font-medium text-navy-900 underline">
              Refund &amp; Cancellation Policy
            </Link>
            . Payments are processed securely by Stripe. Prices include
            applicable display amounts before any tax Stripe may add at
            checkout.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
