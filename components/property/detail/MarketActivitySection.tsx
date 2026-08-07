type Props = {
  areaLabel: string | null;
  auctionsThisWeek: number | null;
  activeNearby: number | null;
  comparableCount: number;
  comparableConfidence: string | null;
};

export default function MarketActivitySection({
  areaLabel,
  auctionsThisWeek,
  activeNearby,
  comparableCount,
  comparableConfidence,
}: Props) {
  return (
    <section
      aria-labelledby="market-activity-heading"
      className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
        Market activity
      </p>
      <h2
        id="market-activity-heading"
        className="mt-1 text-xl font-bold text-navy-900"
      >
        Area &amp; comparable activity
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Derived from verified catalogue activity only — no estimated absorption or
        forecasts.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <dt className="text-[10px] font-semibold uppercase text-slate-400">
            Area activity
          </dt>
          <dd className="mt-1 font-semibold text-navy-900">
            {areaLabel ?? "Unavailable"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <dt className="text-[10px] font-semibold uppercase text-slate-400">
            Auctions this week
          </dt>
          <dd className="mt-1 font-semibold text-navy-900">
            {auctionsThisWeek != null ? auctionsThisWeek : "—"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <dt className="text-[10px] font-semibold uppercase text-slate-400">
            Active nearby
          </dt>
          <dd className="mt-1 font-semibold text-navy-900">
            {activeNearby != null ? activeNearby : "—"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <dt className="text-[10px] font-semibold uppercase text-slate-400">
            Comparables / confidence
          </dt>
          <dd className="mt-1 font-semibold text-navy-900">
            {comparableCount} · {comparableConfidence ?? "Unavailable"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
