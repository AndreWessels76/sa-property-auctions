import type { Metadata } from "next";
import Link from "next/link";
import { PropertyIntelligenceService } from "@/lib/services/PropertyIntelligenceService";

export const metadata: Metadata = {
  title: "Agency Intelligence | SA Property Auctions",
  description:
    "Verified agency coverage, activity and quality profiles — no fabricated rankings.",
};

export default async function AgencyIntelligencePage() {
  const [agencies, connectors] = await Promise.all([
    PropertyIntelligenceService.getAgencyDashboardData(),
    PropertyIntelligenceService.getConnectorHealth(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
          Verified intelligence
        </p>
        <h1 className="mt-1 text-3xl font-bold text-navy-900">
          Agency Dashboards
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Profiles derived only from verified production data. Rankings are not
          invented — counts and rates stay null when samples are insufficient.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-navy-900">Connector health</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connectors.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <p className="font-semibold text-navy-900">{c.name}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                {c.status}
              </p>
              <p className="mt-2 text-xs text-slate-600">{c.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-navy-900">Agency profiles</h2>
        {agencies.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No verified agency activity in the intelligence corpus yet.
          </p>
        ) : (
          <ul className="mt-3 grid gap-4 lg:grid-cols-2">
            {agencies.map((a) => (
              <li
                key={a.agencyName}
                className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm"
              >
                <h3 className="text-lg font-bold text-navy-900">
                  {a.agencyName}
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Active</dt>
                    <dd className="font-semibold">{a.activeListings}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">
                      Completed
                    </dt>
                    <dd className="font-semibold">{a.completedAuctions}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">
                      Verification rate
                    </dt>
                    <dd className="font-semibold">
                      {a.verificationRate == null
                        ? "—"
                        : `${a.verificationRate}%`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">
                      Avg quality
                    </dt>
                    <dd className="font-semibold">
                      {a.averageListingQuality == null
                        ? "—"
                        : a.averageListingQuality}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-slate-500">
                  Coverage: {Object.keys(a.coverage.provinces).length} province
                  {Object.keys(a.coverage.provinces).length === 1 ? "" : "s"},{" "}
                  {Object.keys(a.coverage.towns).length} town
                  {Object.keys(a.coverage.towns).length === 1 ? "" : "s"}
                </p>
                {a.sampleNotes[0] ? (
                  <p className="mt-2 text-xs text-amber-800">{a.sampleNotes[0]}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-sm text-slate-500">
        Also see{" "}
        <Link href="/maps" className="font-semibold text-navy-900 underline">
          Auction Map
        </Link>{" "}
        and{" "}
        <Link href="/heatmaps" className="font-semibold text-navy-900 underline">
          Heat Maps
        </Link>
        .
      </p>
    </main>
  );
}
