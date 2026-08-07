import Link from "next/link";
import type { AgencyIntelligenceProfile } from "@/lib/platform/agencyIntelligence";

type Props = {
  profile: AgencyIntelligenceProfile | null;
  agencyName: string | null;
};

export default function AgencyPerformanceCard({ profile, agencyName }: Props) {
  const name = profile?.agencyName || agencyName || "Agency";

  return (
    <section
      aria-labelledby="agency-performance-heading"
      className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Agency intelligence
          </p>
          <h2
            id="agency-performance-heading"
            className="mt-1 text-xl font-bold text-navy-900"
          >
            {name}
          </h2>
        </div>
        <Link
          href="/agencies"
          className="text-xs font-semibold text-navy-900 underline"
        >
          All agencies
        </Link>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Deterministic counts from verified platform data — no rankings or subjective scores.
      </p>

      {!profile ? (
        <p className="mt-4 text-sm text-slate-500">
          Agency performance unavailable for this listing.
        </p>
      ) : (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Verified / active
            </dt>
            <dd className="text-lg font-bold text-navy-900">
              {profile.activeListings}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Completed
            </dt>
            <dd className="text-lg font-bold text-navy-900">
              {profile.completedAuctions}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Verification rate
            </dt>
            <dd className="text-lg font-bold text-navy-900">
              {profile.verificationRate != null
                ? `${profile.verificationRate}%`
                : "—"}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Avg listing quality
            </dt>
            <dd className="text-lg font-bold text-navy-900">
              {profile.averageListingQuality != null
                ? `${Math.round(profile.averageListingQuality)}`
                : "—"}
            </dd>
          </div>
        </dl>
      )}

      {profile?.sampleNotes?.length ? (
        <ul className="mt-3 space-y-1 text-xs text-slate-500">
          {profile.sampleNotes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
