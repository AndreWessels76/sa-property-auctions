import { formatCurrency } from "@/lib/format";

type Props = {
  estimatedValue: number | null | undefined;
  auctionPrice: number | null | undefined;
};

export default function PriceSpreadCard({
  estimatedValue,
  auctionPrice,
}: Props) {
  const estimated = estimatedValue ?? 0;
  const auction = auctionPrice ?? 0;
  const canCalculate = estimated > 0 && auction > 0;
  const difference = canCalculate ? estimated - auction : null;
  const discount =
    canCalculate && estimated > 0
      ? Math.round(((estimated - auction) / estimated) * 100)
      : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-navy-900">Price spread</h2>
      <p className="mt-1 text-sm text-slate-500">
        Estimated market value versus guide auction price.
      </p>

      {!canCalculate ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
          Price spread cannot yet be calculated because sufficient valuation
          data is not available.
        </p>
      ) : (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Estimated value
            </dt>
            <dd className="mt-1 text-lg font-semibold text-navy-900">
              {formatCurrency(estimated)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Auction price
            </dt>
            <dd className="mt-1 text-lg font-semibold text-navy-900">
              {formatCurrency(auction)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Price difference
            </dt>
            <dd className="mt-1 text-lg font-semibold text-navy-900">
              {difference != null ? formatCurrency(Math.abs(difference)) : "—"}
              {difference != null && difference > 0 ? (
                <span className="ml-1 text-sm font-medium text-emerald-600">
                  below estimate
                </span>
              ) : null}
              {difference != null && difference < 0 ? (
                <span className="ml-1 text-sm font-medium text-amber-600">
                  above estimate
                </span>
              ) : null}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Discount %
            </dt>
            <dd className="mt-1 text-lg font-semibold text-emerald-700">
              {discount != null && discount > 0
                ? `${discount}%`
                : discount === 0
                  ? "0% (at estimate)"
                  : discount != null
                    ? `${Math.abs(discount)}% above estimate`
                    : "Not available"}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
