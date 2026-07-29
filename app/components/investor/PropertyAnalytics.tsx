import { formatCurrency } from "@/lib/format";
import PremiumBadge from "@/app/components/auth/PremiumBadge";

type Props = {
  estimatedValue: number;
  auctionPrice: number;
  comparablePrices?: number[];
};

export default function PropertyAnalytics({
  estimatedValue,
  auctionPrice,
  comparablePrices = [],
}: Props) {
  const avgComparable =
    comparablePrices.length > 0
      ? comparablePrices.reduce((total, price) => total + price, 0) /
        comparablePrices.length
      : estimatedValue;

  const discount =
    estimatedValue > 0
      ? Math.round(
          ((estimatedValue - auctionPrice) / estimatedValue) * 100,
        )
      : 0;

  const comparableSpread =
    comparablePrices.length > 1
      ? Math.max(...comparablePrices) - Math.min(...comparablePrices)
      : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-navy-900">
          Property Analytics
        </h3>
        <PremiumBadge />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Avg comparable
          </p>
          <p className="mt-1 text-lg font-semibold text-navy-900">
            {formatCurrency(avgComparable)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Market discount
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-600">
            {discount > 0 ? `${discount}%` : "—"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Comparables
          </p>
          <p className="mt-1 text-lg font-semibold text-navy-900">
            {comparablePrices.length}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Price spread
          </p>
          <p className="mt-1 text-lg font-semibold text-navy-900">
            {comparableSpread > 0
              ? formatCurrency(comparableSpread)
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
