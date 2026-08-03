import { formatCurrency } from "@/lib/format";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

type Props = {
  property: PropertyDTO;
  confidence?: number | null;
};

export default function PropertyPricingIntelligence({
  property,
  confidence,
}: Props) {
  const estimated = property.estimated_value ?? 0;
  const guide = property.auction_price ?? 0;
  const reserve = property.reserve_price ?? 0;
  const canCompare = estimated > 0 && guide > 0;
  const difference = canCompare ? estimated - guide : null;
  const discount =
    canCompare && estimated > 0
      ? Math.round(((estimated - guide) / estimated) * 100)
      : null;

  const hasAnyPricing = estimated > 0 || guide > 0 || reserve > 0;

  return (
    <section
      aria-labelledby="pricing-intelligence-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="pricing-intelligence-heading"
        className="text-xl font-bold text-navy-900"
      >
        Pricing intelligence
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Verified valuation inputs only — never estimated or fabricated.
      </p>

      {!hasAnyPricing ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
          Insufficient verified pricing data is available for this listing.
          Request a valuation pack from the auction agency before relying on
          price guidance.
        </p>
      ) : (
        <>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Estimated value
              </dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {estimated > 0
                  ? formatCurrency(estimated)
                  : "Not yet published"}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Auction guide price
              </dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {guide > 0 ? formatCurrency(guide) : "Not yet published"}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Reserve price
              </dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {reserve > 0
                  ? formatCurrency(reserve)
                  : "Reserve not disclosed"}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Current bid
              </dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                Live bidding data not connected for this listing
              </dd>
            </div>
          </dl>

          {canCompare ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <dt className="text-xs uppercase tracking-wide text-emerald-700">
                  Price difference
                </dt>
                <dd className="mt-1 text-lg font-semibold text-emerald-900">
                  {formatCurrency(Math.abs(difference ?? 0))}
                  {difference != null && difference > 0
                    ? " below estimate"
                    : difference != null && difference < 0
                      ? " above estimate"
                      : ""}
                </dd>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <dt className="text-xs uppercase tracking-wide text-emerald-700">
                  Potential discount
                </dt>
                <dd className="mt-1 text-lg font-semibold text-emerald-900">
                  {discount != null && discount > 0
                    ? `${discount}%`
                    : discount === 0
                      ? "At estimate"
                      : discount != null
                        ? `${Math.abs(discount)}% above estimate`
                        : "Not calculable"}
                </dd>
              </div>
              {confidence != null ? (
                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    Confidence
                  </dt>
                  <dd className="mt-1 font-semibold text-navy-900">
                    {confidence}% based on available verified inputs
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Price spread cannot be calculated until both estimated value and
              guide price are available from verified sources.
            </p>
          )}
        </>
      )}
    </section>
  );
}
