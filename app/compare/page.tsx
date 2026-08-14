import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ComparisonTable from "@/components/compare/ComparisonTable";
import { PropertyService } from "@/lib/services";
import { SessionService } from "@/lib/auth/SessionService";
import { SubscriptionService } from "@/lib/subscription/SubscriptionService";
import { parseCompareIds } from "@/lib/compare/compareSelection";
import {
  applyCompareAccess,
  compareLimit,
  FREE_COMPARE_LIMIT,
} from "@/lib/intelligence/compareAccess";
import { buildPropertyComparison } from "@/lib/intelligence/propertyComparison";

export const metadata: Metadata = {
  title: "Compare properties",
  description:
    "Side-by-side comparison of verified upcoming and live auction listings. Missing values are labelled Not supplied.",
  robots: { index: false, follow: true },
};

type PageProps = {
  searchParams: Promise<{ ids?: string }>;
};

export default async function ComparePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = parseCompareIds(params.ids);
  const user = await SessionService.currentUser();
  const premium = user ? await SubscriptionService.premium() : false;
  const allowed = applyCompareAccess(requested, premium);
  const loaded = await PropertyService.getByIds(allowed, 1, Math.max(allowed.length, 1));
  const comparison = buildPropertyComparison(loaded.data, {
    premium,
    limit: compareLimit(premium),
  });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
          Investor Intelligence
        </p>
        <h1 className="mt-1 text-3xl font-bold text-navy-900">
          Property comparison
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Decision support only. Values are shown when supplied on the verified
          listing. Reserve, guide, and estimated value are never inferred from
          each other.
        </p>

        {requested.length > allowed.length ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Free accounts can compare {FREE_COMPARE_LIMIT} listings.{" "}
            <Link href="/pricing" className="font-semibold underline">
              Upgrade to Premium
            </Link>{" "}
            to compare up to {compareLimit(true)}.
          </p>
        ) : null}

        <div className="mt-6">
          <ComparisonTable comparison={comparison} premium={premium} />
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Add listings from search with Compare, then return here. Public
          comparison uses upcoming and live verified catalogue only.
        </p>
      </main>
      <Footer />
    </>
  );
}
