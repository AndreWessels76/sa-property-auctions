import Link from "next/link";

type ComparableSummary = {
  town: string | null;
  suburb: string | null;
  propertyType: string | null;
  comparableConfidence: string;
  matchingEvidence: string[];
  salePrice: number | null;
};

type Props = {
  premium: boolean;
  summary: {
    historicalAuctions: number;
    verifiedSales: number;
    bestComparableConfidence: string;
    hasSalePriceEvidence: boolean;
    pricePerM2: { calculable: boolean; value: number | null; reason: string | null };
    pricePerHa: { calculable: boolean; value: number | null; reason: string | null; approximate: boolean };
    limitations: string[];
  };
  bestComparable: ComparableSummary | null;
  comparablesCount: number;
  researchHref: string;
};

function money(n: number | null) {
  if (n == null || !Number.isFinite(n) || n <= 0) return "Not supplied";
  return `R${Math.round(n).toLocaleString("en-ZA")}`;
}

export default function HistoricalMarketEvidencePanel({
  premium,
  summary,
  bestComparable,
  comparablesCount,
  researchHref,
}: Props) {
  return (
    <section
      aria-labelledby="historical-market-evidence-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="historical-market-evidence-heading"
        className="text-xl font-bold text-navy-900"
      >
        Historical market evidence
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Event-backed comparables and verified sale evidence. Not investment advice —
        no predicted values or purchase recommendations.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Historical auctions
          </dt>
          <dd className="mt-1 text-lg font-semibold">{summary.historicalAuctions}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Verified sales
          </dt>
          <dd className="mt-1 text-lg font-semibold">{summary.verifiedSales}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Comparables
          </dt>
          <dd className="mt-1 text-lg font-semibold">{comparablesCount}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Best confidence
          </dt>
          <dd className="mt-1 text-lg font-semibold">
            {summary.bestComparableConfidence}
          </dd>
        </div>
      </dl>

      {bestComparable ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-navy-900">Best verified comparable</p>
          <p className="mt-1 text-slate-600">
            {[bestComparable.suburb, bestComparable.town].filter(Boolean).join(", ") ||
              "Location not supplied"}{" "}
            · {bestComparable.propertyType ?? "Type not supplied"}
          </p>
          <p className="mt-1 text-slate-600">
            Sale price: {money(bestComparable.salePrice)} · Confidence:{" "}
            {bestComparable.comparableConfidence}
          </p>
          {premium && bestComparable.matchingEvidence.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-xs text-slate-500">
              {bestComparable.matchingEvidence.slice(0, 5).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm italic text-slate-500">
          No eligible comparables matched verified similarity rules.
        </p>
      )}

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <p>
          Price/m²:{" "}
          {summary.pricePerM2.calculable
            ? money(summary.pricePerM2.value)
            : summary.pricePerM2.reason ?? "Not enough verified data"}
        </p>
        <p>
          Price/ha:{" "}
          {summary.pricePerHa.calculable
            ? `${money(summary.pricePerHa.value)}${summary.pricePerHa.approximate ? " (approx.)" : ""}`
            : summary.pricePerHa.reason ?? "Not enough verified data"}
        </p>
      </div>

      {summary.limitations.length > 0 ? (
        <ul className="mt-3 text-xs text-slate-500">
          {summary.limitations.map((l) => (
            <li key={l}>· {l}</li>
          ))}
        </ul>
      ) : null}

      <p className="mt-4 text-sm">
        <Link href={researchHref} className="font-medium text-navy-800 underline">
          Full research report
        </Link>
        {!premium ? (
          <>
            {" "}
            ·{" "}
            <Link href="/pricing" className="font-medium text-navy-800 underline">
              Premium
            </Link>{" "}
            unlocks expanded comparables and timeline
          </>
        ) : null}
      </p>
    </section>
  );
}
