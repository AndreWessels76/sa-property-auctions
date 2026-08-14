import Link from "next/link";

type Snapshot = {
  decisionStatus: string;
  decisionReasons: string[];
  snapshot: {
    property: Record<string, string | number | null>;
    priceEvidence: Array<{
      label: string;
      value: number | null;
      evidenceStatus: string;
    }>;
    historicalEvidence: {
      previousEvents: number;
      verifiedPrices: number;
      evidenceQuality: string | null;
    };
    comparableEvidence: {
      acceptedCount: number;
      confidence: string;
      median: number | null;
    };
    marketEvidence: {
      verifiedSales: number;
      median: number | null;
      trend: string;
    };
    evidenceWarnings: string[];
  };
  premium: boolean;
  researchHref: string;
};

function money(n: number | null) {
  if (n == null || !Number.isFinite(n) || n <= 0) return "Not supplied";
  return `R${Math.round(n).toLocaleString("en-ZA")}`;
}

export default function InvestorIntelligenceSnapshotPanel({
  decisionStatus,
  decisionReasons,
  snapshot,
  premium,
  researchHref,
}: Snapshot) {
  const s = snapshot;
  return (
    <section
      aria-labelledby="investor-intelligence-snapshot-heading"
      className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="investor-intelligence-snapshot-heading"
        className="text-xl font-bold text-navy-900"
      >
        Investor Intelligence Snapshot
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Evidence-backed market intelligence — not investment advice. Missing data
        remains explicit.
      </p>

      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Investor Evidence Status
        </p>
        <p className="mt-1 text-lg font-semibold text-navy-900">{decisionStatus}</p>
        {decisionReasons.length ? (
          <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
            {decisionReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Property</dt>
          <dd className="mt-1 font-medium">
            {[s.property.town, s.property.suburb].filter(Boolean).join(", ") ||
              "Not supplied"}
          </dd>
          <dd className="text-xs text-slate-500">{String(s.property.propertyType ?? "—")}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Verified sales (area)
          </dt>
          <dd className="mt-1 font-medium">{s.marketEvidence.verifiedSales}</dd>
          <dd className="text-xs text-slate-500">
            Median: {money(s.marketEvidence.median)}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Comparables</dt>
          <dd className="mt-1 font-medium">{s.comparableEvidence.acceptedCount}</dd>
          <dd className="text-xs text-slate-500">
            Confidence: {s.comparableEvidence.confidence}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Trend</dt>
          <dd className="mt-1 font-medium">{s.marketEvidence.trend}</dd>
        </div>
      </dl>

      {s.evidenceWarnings.length ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Evidence warnings</p>
          <ul className="mt-1 list-inside list-disc">
            {s.evidenceWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!premium ? (
        <p className="mt-4 text-sm text-slate-500">
          Premium unlocks detailed comparables, market statistics, and evidence-chain
          detail.
        </p>
      ) : null}

      <Link
        href={researchHref}
        className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:underline"
      >
        Full research report →
      </Link>
    </section>
  );
}
