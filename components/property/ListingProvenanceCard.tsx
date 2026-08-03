import { formatAuctionDate } from "@/lib/format";
import { formatListingStatusLabel } from "@/lib/data/propertyFoundation";
import {
  formatVerificationLabel,
  normalizeVerificationState,
} from "@/lib/data/verificationStates";
import { isSeedOrDemo } from "@/lib/data/propertyFoundation";
import {
  getSourceReliabilityLabel,
  maskListingReference,
} from "@/lib/property/detailExperience";

type Props = {
  dataClassification: string | null | undefined;
  verificationState?: string | null | undefined;
  sourceName: string | null | undefined;
  sourceUrl: string | null | undefined;
  sourceLegacy: string | null | undefined;
  externalListingId: string | null | undefined;
  importedAt: string | null | undefined;
  lastVerifiedAt: string | null | undefined;
  listingStatus: string | null | undefined;
  provenanceNotes: string | null | undefined;
  sourceReliabilityLabel?: string;
};

export default function ListingProvenanceCard({
  dataClassification,
  verificationState,
  sourceName,
  sourceUrl,
  sourceLegacy,
  externalListingId,
  importedAt,
  lastVerifiedAt,
  listingStatus,
  provenanceNotes,
  sourceReliabilityLabel,
}: Props) {
  const seed = isSeedOrDemo(dataClassification, sourceLegacy);
  const state =
    normalizeVerificationState(verificationState) ??
    (seed ? "seed" : "pending_verification");
  const label = formatVerificationLabel(state);
  const highlight =
    state === "seed" ||
    state === "pending_verification" ||
    state === "expired" ||
    state === "withdrawn";

  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm ${
        highlight
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-navy-900">Listing provenance</h2>
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
            highlight
              ? "bg-amber-200 text-amber-950"
              : state === "verified"
                ? "bg-emerald-100 text-emerald-900"
                : "bg-slate-100 text-slate-700"
          }`}
        >
          {label}
        </span>
      </div>

      {state === "seed" ? (
        <p className="mt-3 text-sm leading-relaxed text-amber-950/80">
          This record is <strong>seed / illustrative catalogue data</strong>. It
          is <strong>not</strong> a verified live auction notice. Do not rely on
          it for bidding decisions.{" "}
          {provenanceNotes ||
            "Replace with licensed imports before treating as production."}
        </p>
      ) : state === "pending_verification" ? (
        <p className="mt-3 text-sm leading-relaxed text-amber-950/80">
          This listing is <strong>pending verification</strong> against its
          original auction source. Treat details as provisional until verified.{" "}
          {provenanceNotes || ""}
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
            Imported from
          </dt>
          <dd className="mt-1 font-medium text-navy-900">
            {sourceName ||
              "Source name not recorded — confirm with agency before bidding."}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Original source
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
            Imported date
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
            Verification state
          </dt>
          <dd className="mt-1 font-medium text-navy-900">{label}</dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Source reliability
          </dt>
          <dd className="mt-1 font-medium text-navy-900">
            {sourceReliabilityLabel ||
              getSourceReliabilityLabel({
                isSeedOrDemo: seed,
                verification_state: state,
                last_verified_at: lastVerifiedAt,
                isPendingVerification: state === "pending_verification",
              } as import("@/lib/dto/PropertyDTO").PropertyDTO)}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Listing reference
          </dt>
          <dd className="mt-1 font-medium text-navy-900">
            {maskListingReference(externalListingId)}
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
      </dl>
    </section>
  );
}
