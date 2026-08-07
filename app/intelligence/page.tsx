import type { Metadata } from "next";
import Link from "next/link";
import { PropertyIntelligenceService } from "@/lib/services/PropertyIntelligenceService";

export const metadata: Metadata = {
  title: "Market Intelligence | SA Property Auctions",
  description:
    "Verified market and area intelligence from production auction data.",
};

export default async function MarketIntelligencePage() {
  const [market, areas, governance] = await Promise.all([
    PropertyIntelligenceService.getMarketDashboardData(),
    PropertyIntelligenceService.getAreaDashboardData(),
    PropertyIntelligenceService.getGovernanceReport(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
          Verified intelligence
        </p>
        <h1 className="mt-1 text-3xl font-bold text-navy-900">
          Market & Area Intelligence
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Sector and town statistics from verified listings only. Trends and
          averages are withheld when samples are insufficient.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Eligible corpus: {market.totalEligible} · Generated{" "}
          {new Date(market.generatedAt).toLocaleString("en-ZA")}
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-navy-900">Market sectors</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {market.sectors.map((s) => (
            <li
              key={s.sector}
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <p className="font-semibold text-navy-900">{s.sector}</p>
              <p className="mt-2 text-sm text-slate-600">
                {s.activeCount} active · {s.listingCount} eligible
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Avg reserve:{" "}
                {s.averageReserve == null
                  ? "withheld"
                  : `R${Math.round(s.averageReserve).toLocaleString("en-ZA")}`}
              </p>
              {s.notes[0] ? (
                <p className="mt-2 text-xs text-amber-800">{s.notes[0]}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-navy-900">Town profiles</h2>
        <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
          {areas.slice(0, 40).map((a) => (
            <li
              key={a.town}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-semibold text-navy-900">{a.town}</p>
                <p className="text-xs text-slate-500">{a.province}</p>
              </div>
              <p className="text-xs font-medium text-slate-600">
                {a.upcomingAuctions} upcoming · {a.verifiedAuctions} verified
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-navy-900">Data governance</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(governance.summary).map(([k, v]) => (
            <div
              key={k}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                {k}
              </dt>
              <dd className="text-xl font-bold text-navy-900">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-8 text-sm text-slate-500">
        <Link href="/agencies" className="font-semibold text-navy-900 underline">
          Agency dashboards
        </Link>
        {" · "}
        <Link href="/maps" className="font-semibold text-navy-900 underline">
          Map
        </Link>
        {" · "}
        <Link href="/heatmaps" className="font-semibold text-navy-900 underline">
          Heat maps
        </Link>
      </p>
    </main>
  );
}
