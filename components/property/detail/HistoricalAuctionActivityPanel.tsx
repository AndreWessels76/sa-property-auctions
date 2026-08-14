import Link from "next/link";
import { formatAuctionDate } from "@/lib/format";

type TimelineRow = {
  observationId: string;
  auctionEventId: string | null;
  auctionDate: string | null;
  state: string;
  salePrice: number | null;
  auctionPrice: number | null;
  sourceName: string | null;
  sourceUnit: string;
};

type Props = {
  premium: boolean;
  propertyMasterId: string | null;
  summary: {
    historicalEvents: number;
    confirmedSales: number;
    withdrawn: number;
    cancelled?: number;
    expired?: number;
    outcomeNotSupplied: number;
  };
  timeline: TimelineRow[];
  insufficientMessage: string | null;
};

function money(n: number | null, label: string) {
  if (n == null || !Number.isFinite(n) || n <= 0) {
    return (
      <span className="italic text-slate-400">
        {label} not supplied
      </span>
    );
  }
  return (
    <span>
      {label} R{Math.round(n).toLocaleString("en-ZA")}
    </span>
  );
}

export default function HistoricalAuctionActivityPanel({
  premium,
  propertyMasterId,
  summary,
  timeline,
  insufficientMessage,
}: Props) {
  return (
    <section
      aria-labelledby="historical-auction-activity-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="historical-auction-activity-heading"
        className="text-xl font-bold text-navy-900"
      >
        Historical auction activity
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Completed, sold, withdrawn, cancelled, and expired Auction Events for
        this Property Master. Event-backed history is preferred over listing
        fallback. These are not current catalogue opportunities.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Historical events
          </dt>
          <dd className="mt-1 text-lg font-semibold text-navy-900">
            {summary.historicalEvents}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Confirmed sales
          </dt>
          <dd className="mt-1 text-lg font-semibold text-navy-900">
            {summary.confirmedSales}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Withdrawn
          </dt>
          <dd className="mt-1 text-lg font-semibold text-navy-900">
            {summary.withdrawn}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Outcome not supplied
          </dt>
          <dd className="mt-1 text-lg font-semibold text-navy-900">
            {summary.outcomeNotSupplied}
          </dd>
        </div>
      </dl>

      {!propertyMasterId ? (
        <p className="mt-4 text-sm italic text-slate-500">
          No Property Master linked — historical events cannot be grouped yet.
        </p>
      ) : null}

      {insufficientMessage ? (
        <p className="mt-4 text-sm text-slate-600">{insufficientMessage}</p>
      ) : null}

      {premium && timeline.length > 0 ? (
        <ol className="mt-5 space-y-3">
          {timeline.map((row) => (
            <li
              key={row.observationId}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold capitalize text-navy-900">
                  {row.state.replace("_", " ")}
                </span>
                <span className="text-slate-500">
                  {row.auctionDate
                    ? formatAuctionDate(row.auctionDate)
                    : "Auction date not supplied"}
                </span>
              </div>
              <div className="mt-1 text-slate-600">
                {money(row.salePrice, "Sale price")}
                <span className="mx-2 text-slate-300">·</span>
                {money(row.auctionPrice, "Auction price")}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {row.sourceName ?? "Source not supplied"}
                {row.sourceUnit === "listing_fallback"
                  ? " · listing fallback (no Auction Event row)"
                  : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {!premium ? (
        <p className="mt-4 text-sm">
          <Link href="/pricing" className="font-medium text-navy-800 underline">
            Upgrade to Premium
          </Link>{" "}
          for the verified historical timeline.
        </p>
      ) : null}
    </section>
  );
}
