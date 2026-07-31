import { formatAuctionDate } from "@/lib/format";
import {
  formatListingStatusLabel,
  isSeedOrDemo,
} from "@/lib/data/propertyFoundation";

type Props = {
  dataClassification: string | null | undefined;
  sourceName: string | null | undefined;
  sourceUrl: string | null | undefined;
  sourceLegacy: string | null | undefined;
  externalListingId: string | null | undefined;
  importedAt: string | null | undefined;
  lastVerifiedAt: string | null | undefined;
  listingStatus: string | null | undefined;
  dataQualityScore: number | null | undefined;
  provenanceNotes: string | null | undefined;
};

export default function ListingProvenanceCard({
  dataClassification,
  sourceName,
  sourceUrl,
  sourceLegacy,
  externalListingId,
  importedAt,
  lastVerifiedAt,
  listingStatus,
  dataQualityScore,
  provenanceNotes,
}: Props) {
  const seed = isSeedOrDemo(dataClassification, sourceLegacy);
  const classificationLabel = seed
    ? "Seed data"
    : (dataClassification || "needs_verification").replace(/_/g, " ");

  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm ${
        seed
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-navy-900">Listing provenance</h2>
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
            seed
              ? "bg-amber-200 text-amber-950"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {classificationLabel}
        </span>
      </div>

      {seed ? (
        <p className="mt-3 text-sm leading-relaxed text-amber-950/80">
          This record is <strong>seed / illustrative catalogue data</strong> for
          public beta. It is <strong>not</strong> a verified live auction notice.
          Do not rely on it for bidding decisions.{" "}
          {provenanceNotes ||
            "Replace with licensed imports before treating as production."}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Traceability fields for this listing. Always confirm details with the
          conducting agency before acting.
        </p>
      )}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Source name
          </dt>
          <dd className="mt-1 font-medium text-navy-900">
            {sourceName ||
              "Source name not recorded — listing should not be treated as production-ready."}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Source URL
          </dt>
          <dd className="mt-1 font-medium text-navy-900">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {sourceUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              "Original source URL not yet linked."
            )}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Imported
          </dt>
          <dd className="mt-1 font-medium text-navy-900">
            {importedAt
              ? formatAuctionDate(importedAt)
              : "Import timestamp not recorded."}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Last verified
          </dt>
          <dd className="mt-1 font-medium text-navy-900">
            {lastVerifiedAt
              ? formatAuctionDate(lastVerifiedAt)
              : "Not verified against an original source yet."}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            External listing ID
          </dt>
          <dd className="mt-1 font-medium text-navy-900">
            {externalListingId || "No external ID recorded."}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Listing status
          </dt>
          <dd className="mt-1 font-medium text-navy-900">
            {formatListingStatusLabel(listingStatus)}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3 sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Data quality score
          </dt>
          <dd className="mt-1 font-medium text-navy-900">
            {dataQualityScore != null
              ? `${dataQualityScore}/100 (computed from completeness — not a valuation)`
              : "Quality score not yet computed."}
          </dd>
        </div>
      </dl>
    </section>
  );
}
