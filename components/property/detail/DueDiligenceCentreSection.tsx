import type { DiligenceItem, DueDiligenceCentre } from "@/lib/property/dueDiligence";

type Props = {
  centre: DueDiligenceCentre;
};

function StatusBadge({ status }: { status: DiligenceItem["status"] }) {
  const styles =
    status === "verified"
      ? "bg-emerald-100 text-emerald-900"
      : status === "pending_verification"
        ? "bg-amber-100 text-amber-950"
        : "bg-slate-100 text-slate-600";
  const label =
    status === "verified"
      ? "Verified"
      : status === "pending_verification"
        ? "Pending Verification"
        : "Unavailable";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${styles}`}>
      {label}
    </span>
  );
}

export default function DueDiligenceCentreSection({ centre }: Props) {
  const groups = Array.from(new Set(centre.items.map((i) => i.group)));

  return (
    <section
      aria-labelledby="due-diligence-heading"
      className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Due diligence
          </p>
          <h2 id="due-diligence-heading" className="mt-1 text-xl font-bold text-navy-900">
            Due Diligence Centre
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          {centre.summary.verifiedCount} verified · {centre.summary.unavailableCount}{" "}
          unavailable · {centre.summary.pendingCount} pending
        </p>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Missing facts are marked unavailable — never fabricated.
      </p>

      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <div key={group}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {group.replace(/_/g, " ")}
            </h3>
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
              {centre.items
                .filter((i) => i.group === group)
                .map((item) => (
                  <li
                    key={item.key}
                    className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-navy-900">{item.label}</p>
                      <p className="text-xs text-slate-600">
                        {item.value ?? "—"}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {centre.outstanding.length > 0 ? (
        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Outstanding / unavailable: {centre.outstanding.slice(0, 8).join(", ")}
          {centre.outstanding.length > 8 ? "…" : ""}
        </div>
      ) : null}
    </section>
  );
}
