import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HistoricalIntelligenceService } from "@/lib/services/HistoricalIntelligenceService";
import { ComparableIntelligenceService } from "@/lib/services/ComparableIntelligenceService";
import { OutcomeIntelligenceService } from "@/lib/services/OutcomeIntelligenceService";
import { HistoricalIntelligence40Service } from "@/lib/services/HistoricalIntelligence40Service";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ town: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { town } = await params;
  const decoded = decodeURIComponent(town);
  return {
    title: `${decoded} — Historical Area Intelligence | SA Property Auctions`,
    description: "Verified historical auction activity and sale evidence by town.",
  };
}

export default async function AreaIntelligencePage({ params }: PageProps) {
  const { town } = await params;
  const decoded = decodeURIComponent(town ?? "").trim();
  if (!decoded) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-10">Town required.</main>
        <Footer />
      </>
    );
  }

  const [hi, marketEvidence, outcomePerformance, evidence] = await Promise.all([
    HistoricalIntelligenceService.forArea(decoded),
    ComparableIntelligenceService.forArea(decoded),
    OutcomeIntelligenceService.forTown(decoded),
    HistoricalIntelligence40Service.evidenceOverview().catch(() => null),
  ]);

  const perf = outcomePerformance.report?.performance;
  const median = marketEvidence.marketEvidence.medianSalePrice;
  const insufficientSales =
    (perf?.sold ?? 0) < 5 || median.sampleSafety === "insufficient_data";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        <Link href="/intelligence" className="text-sm text-slate-600 hover:text-navy-900">
          ← Market intelligence
        </Link>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Historical area intelligence
          </p>
          <h1 className="mt-1 text-3xl font-bold text-navy-900">{decoded}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Event-backed historical auction activity and confirmed sale evidence only.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-bold text-navy-900">Auction activity</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-slate-500">Historical events</dt>
              <dd className="font-semibold">
                {"activity" in hi && hi.activity
                  ? hi.activity.historicalEvents
                  : "report" in hi && hi.report
                    ? hi.report.activity.historicalEvents
                    : 0}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Confirmed sales</dt>
              <dd className="font-semibold">{perf?.sold ?? 0}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Unknown outcomes</dt>
              <dd className="font-semibold">{perf?.unknown ?? 0}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-bold text-navy-900">Sale price evidence</h2>
          {insufficientSales ? (
            <p className="mt-2 text-sm text-amber-800">
              Insufficient historical sales data — minimum 5 verified SOLD events required for
              median statistics. Showing {perf?.sold ?? 0} verified sale
              {(perf?.sold ?? 0) === 1 ? "" : "s"} where available.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-700">
              Median verified sale price:{" "}
              {median.median != null
                ? `R${Math.round(median.median).toLocaleString("en-ZA")}`
                : "Not calculable"}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-bold text-navy-900">Evidence quality</h2>
          <p className="mt-2 text-sm text-slate-600">
            Corpus average confidence:{" "}
            {evidence?.coverage?.averageOverallConfidence ?? "INSUFFICIENT"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Comparable-ready events nationally:{" "}
            {evidence?.coverage?.comparableReadyEvents ?? 0}
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
