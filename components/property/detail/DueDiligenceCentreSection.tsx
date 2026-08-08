import type { DiligenceItem, DueDiligenceCentre } from "@/lib/property/dueDiligence";

type Props = {
  centre: DueDiligenceCentre;
};

function StatusBadge({ status, label }: { status: DiligenceItem["status"]; label: string }) {
  const styles =
    status === "verified"
      ? "bg-emerald-100 text-emerald-900"
      : status === "source_confirmed"
        ? "bg-sky-100 text-sky-950"
        : status === "extracted"
          ? "bg-indigo-100 text-indigo-950"
          : status === "pending_verification"
            ? "bg-amber-100 text-amber-950"
            : status === "restricted" || status === "expired"
              ? "bg-rose-100 text-rose-900"
              : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${styles}`}>
      {label}
    </span>
  );
}

export default function DueDiligenceCentreSection({ centre }: Props) {
  const groups = Array.from(new Set(centre.items.map((i) => i.group)));
  const c = centre.completeness;

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
          Completeness {c.overall}% · {centre.summary.verifiedCount} verified ·{" "}
          {centre.summary.sourceConfirmedCount} source · {centre.summary.extractedCount}{" "}
          extracted
        </p>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Source-backed facts only. Missing information is labelled clearly — never fabricated.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
        {(
          [
            ["Property", c.property],
            ["Auction", c.auction],
            ["Location", c.location],
            ["Land", c.land],
            ["Documents", c.documents],
            ["Legal", c.legal],
            ["Building", c.building],
            ["Utilities", c.utilities],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-50 px-2 py-1.5">
            <dt className="text-slate-400">{label}</dt>
            <dd className="font-semibold text-navy-900">{value}%</dd>
          </div>
        ))}
      </dl>

      {centre.importantMissing.length > 0 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Important missing: {centre.importantMissing.join(", ")}
        </div>
      ) : null}

      {centre.conflicts.length > 0 ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          Conflicting source information on:{" "}
          {centre.conflicts.map((x) => x.field).join(", ")} — sent to verification queue
          (no silent resolution).
        </div>
      ) : null}

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
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-navy-900">{item.label}</p>
                      <p className="text-xs text-slate-600 break-words">
                        {item.value ?? "—"}
                      </p>
                      {item.evidence?.original_text &&
                      item.evidence.extraction_method === "deterministic_text" ? (
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Evidence: “{item.evidence.original_text.slice(0, 120)}
                          {item.evidence.original_text.length > 120 ? "…" : ""}”
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={item.status} label={item.statusLabel} />
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {centre.outstanding.length > 0 ? (
        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Not supplied / not found / pending:{" "}
          {centre.outstanding.slice(0, 10).join(", ")}
          {centre.outstanding.length > 10 ? "…" : ""}
        </div>
      ) : null}
    </section>
  );
}
