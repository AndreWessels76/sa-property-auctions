type HistoryEvent = {
  year: number;
  auctionDate: string | null;
  outcome: string;
  salePrice: number | null;
  sourceUrl: string | null;
};

type PriceChange = {
  calculable: boolean;
  narrative: string;
  previousSalePrice: number | null;
  latestSalePrice: number | null;
  percentageChange: number | null;
};

type Props = {
  premium: boolean;
  chain: {
    propertyMasterId: string;
    events: HistoryEvent[];
  };
  priceChange: PriceChange | null;
};

function money(n: number | null) {
  if (n == null || !Number.isFinite(n) || n <= 0) return "Not supplied";
  return `R${Math.round(n).toLocaleString("en-ZA")}`;
}

export default function HistoricalOutcomePerformancePanel({
  premium,
  chain,
  priceChange,
}: Props) {
  const confirmed = chain.events.filter((e) =>
    ["SOLD", "WITHDRAWN", "CANCELLED"].includes(e.outcome),
  ).length;
  const soldWithPrice = chain.events.filter(
    (e) => e.outcome === "SOLD" && e.salePrice != null,
  ).length;

  return (
    <section
      aria-labelledby="historical-outcome-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="historical-outcome-heading" className="text-xl font-bold text-navy-900">
        Historical performance
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Property Master auction outcomes and verified sale evidence. No inferred values
        or investment advice.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Previous auctions
          </dt>
          <dd className="mt-1 text-lg font-semibold">{chain.events.length}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Confirmed outcomes
          </dt>
          <dd className="mt-1 text-lg font-semibold">{confirmed}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Verified sale prices
          </dt>
          <dd className="mt-1 text-lg font-semibold">{soldWithPrice}</dd>
        </div>
      </dl>

      {chain.events.length > 0 ? (
        <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4 text-sm">
          {chain.events.map((event, i) => (
            <li key={`${event.auctionDate ?? i}-${event.outcome}`}>
              <p className="font-semibold text-navy-900">
                {event.year > 0 ? `${event.year} Auction` : "Auction event"}
              </p>
              <p className="text-slate-600">→ {event.outcome}</p>
              {event.outcome === "SOLD" ? (
                <p className="text-slate-600">→ Sale price {money(event.salePrice)}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No verified historical sale data</p>
      )}

      {premium && priceChange ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-navy-900">Price change (same Property Master)</p>
          <p className="mt-1 text-slate-600">{priceChange.narrative}</p>
          {priceChange.calculable ? (
            <p className="mt-1 text-slate-600">
              {money(priceChange.previousSalePrice)} → {money(priceChange.latestSalePrice)}
              {priceChange.percentageChange != null
                ? ` (${priceChange.percentageChange > 0 ? "+" : ""}${priceChange.percentageChange}%)`
                : null}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
