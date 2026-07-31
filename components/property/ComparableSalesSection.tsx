import Link from "next/link";
import {
  formatAuctionDate,
  formatCurrency,
} from "@/lib/format";

export type ComparableSaleRow = {
  id: string;
  address: string;
  saleDate: string;
  salePrice: number;
  bedrooms: number | null;
  bathrooms: number | null;
  distanceKm: number | null;
  priceDifference: number | null;
  sameTown?: boolean;
};

type Props = {
  rows: ComparableSaleRow[];
  subjectAuctionPrice: number | null;
};

export default function ComparableSalesSection({
  rows,
  subjectAuctionPrice,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-navy-900">Comparable sales</h2>
      <p className="mt-1 text-sm text-slate-500">
        Nearby or similar auction listings used for market context.
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
          No comparable auction sales are currently available for this property.
          Comparable sales will automatically appear as more auction history
          becomes available.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => {
            const distanceLabel =
              row.distanceKm != null
                ? `${row.distanceKm.toFixed(1)} km`
                : row.sameTown
                  ? "Same town"
                  : "Distance not available";

            const diff =
              row.priceDifference != null
                ? row.priceDifference
                : subjectAuctionPrice != null && row.salePrice > 0
                  ? row.salePrice - subjectAuctionPrice
                  : null;

            return (
              <li
                key={row.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/properties/${row.id}`}
                      className="font-semibold text-navy-900 underline-offset-2 hover:underline"
                    >
                      {row.address || "Address not recorded"}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      Sale date:{" "}
                      {row.saleDate
                        ? formatAuctionDate(row.saleDate)
                        : "Date not available"}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-navy-900">
                    {row.salePrice > 0
                      ? formatCurrency(row.salePrice)
                      : "Price not available"}
                  </p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                  <div>
                    <dt className="uppercase tracking-wide text-slate-400">
                      Beds
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {row.bedrooms != null && row.bedrooms > 0
                        ? row.bedrooms
                        : "Not listed"}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-400">
                      Baths
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {row.bathrooms != null && row.bathrooms > 0
                        ? row.bathrooms
                        : "Not listed"}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-400">
                      Distance
                    </dt>
                    <dd className="mt-0.5 font-medium">{distanceLabel}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-400">
                      Price difference
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {diff == null
                        ? "Not available"
                        : `${diff >= 0 ? "+" : "−"}${formatCurrency(Math.abs(diff))}`}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
