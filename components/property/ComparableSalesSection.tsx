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
  propertyType?: string | null;
  landSize?: number | null;
  similarityScore?: number | null;
};

type Props = {
  rows: ComparableSaleRow[];
  subjectAuctionPrice: number | null;
};

function formatPricePerSqm(price: number, landSize: number | null | undefined) {
  if (!landSize || landSize <= 0 || price <= 0) return "Not available";
  const perSqm = price / landSize;
  return formatCurrency(Math.round(perSqm));
}

export default function ComparableSalesSection({
  rows,
  subjectAuctionPrice,
}: Props) {
  return (
    <section
      aria-labelledby="comparable-sales-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="comparable-sales-heading" className="text-xl font-bold text-navy-900">
        Comparable sales
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Verified nearby auction history — never fabricated comparables.
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
          No comparable auction sales are currently available for this property.
          Comparables will appear automatically as more verified auction history
          is recorded in this area.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Distance</th>
                <th className="px-3 py-2">Sale date</th>
                <th className="px-3 py-2">Sale price</th>
                <th className="hidden px-3 py-2 md:table-cell">Type</th>
                <th className="hidden px-3 py-2 sm:table-cell">Beds</th>
                <th className="hidden px-3 py-2 sm:table-cell">Baths</th>
                <th className="hidden px-3 py-2 lg:table-cell">Land</th>
                <th className="hidden px-3 py-2 lg:table-cell">Price/m²</th>
                <th className="px-3 py-2">Similarity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const distanceLabel =
                  row.distanceKm != null
                    ? `${row.distanceKm.toFixed(1)} km`
                    : row.sameTown
                      ? "Same town"
                      : "Not available";

                const diff =
                  row.priceDifference != null
                    ? row.priceDifference
                    : subjectAuctionPrice != null && row.salePrice > 0
                      ? row.salePrice - subjectAuctionPrice
                      : null;

                return (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-3 py-3">
                      <Link
                        href={`/properties/${row.id}`}
                        className="font-semibold text-navy-900 underline-offset-2 hover:underline"
                      >
                        {row.address || "Address not recorded"}
                      </Link>
                      {diff != null ? (
                        <p className="mt-1 text-xs text-slate-500">
                          vs guide: {diff >= 0 ? "+" : "−"}
                          {formatCurrency(Math.abs(diff))}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{distanceLabel}</td>
                    <td className="px-3 py-3">
                      {row.saleDate
                        ? formatAuctionDate(row.saleDate)
                        : "Not available"}
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      {row.salePrice > 0
                        ? formatCurrency(row.salePrice)
                        : "Not available"}
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      {row.propertyType || "—"}
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      {row.bedrooms != null && row.bedrooms > 0
                        ? row.bedrooms
                        : "—"}
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      {row.bathrooms != null && row.bathrooms > 0
                        ? row.bathrooms
                        : "—"}
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      {row.landSize != null && row.landSize > 0
                        ? `${row.landSize.toLocaleString("en-ZA")} m²`
                        : "—"}
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      {formatPricePerSqm(row.salePrice, row.landSize)}
                    </td>
                    <td className="px-3 py-3">
                      {row.similarityScore != null && row.similarityScore > 0
                        ? `${Math.round(row.similarityScore)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
