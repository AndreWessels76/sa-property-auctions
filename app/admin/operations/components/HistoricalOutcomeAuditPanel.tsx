"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

type Audit = {
  ok: boolean;
  error?: string;
  version?: string;
  eventsScanned?: number;
  salePricesFound?: number;
  conflictsDetected?: number;
  conflictsOpen?: number;
  needsReview?: number;
  persistedObservations?: number;
  performance?: {
    totalAuctions: number;
    sold: number;
    withdrawn: number;
    cancelled: number;
    expired: number;
    unknown: number;
    saleRate: { value: number | null; label: string; calculable: boolean };
    outcomeCoverage: { numerator: number; denominator: number; percentage: number | null };
  };
  coverage?: {
    historicalEvents: number;
    outcomeCoverage: { label: string };
    salePriceCoverage: { label: string };
  };
  classifications?: Array<{
    observationId: string;
    outcome: string;
    confirmed: boolean;
    salePrice: number | null;
    conflict: boolean;
  }>;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-900/50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function HistoricalOutcomeAuditPanel() {
  const [data, setData] = useState<Audit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/outcomes", {
          cache: "no-store",
        });
        const json = (await res.json()) as Audit;
        if (!json.ok) {
          setError(json.error ?? "Failed to load outcome audit");
          return;
        }
        setError(null);
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const perf = data?.performance;

  return (
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Historical Outcome Audit (3.0)</h2>
          <p className="mt-1 text-sm text-slate-300">
            Deterministic auction outcomes and sale price evidence. Conflicts require
            admin review — never auto-resolved.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          {pending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-amber-300">{error}</p> : null}

      {perf ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
          <Stat label="Events scanned" value={data?.eventsScanned ?? perf.totalAuctions} />
          <Stat label="Confirmed sold" value={perf.sold} />
          <Stat label="Withdrawn" value={perf.withdrawn} />
          <Stat label="Cancelled" value={perf.cancelled} />
          <Stat label="Expired" value={perf.expired} />
          <Stat label="Unknown" value={perf.unknown} />
        </div>
      ) : null}

      {data ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <Stat label="Sale prices found" value={data.salePricesFound ?? 0} />
          <Stat label="Conflicts detected" value={data.conflictsDetected ?? 0} />
          <Stat label="Needs review" value={data.needsReview ?? 0} />
          <Stat
            label="Outcome coverage"
            value={
              perf?.outcomeCoverage.percentage != null
                ? `${perf.outcomeCoverage.percentage}%`
                : "—"
            }
          />
        </div>
      ) : null}

      {data?.coverage ? (
        <p className="mt-4 text-sm text-slate-300">
          {data.coverage.outcomeCoverage.label} · {data.coverage.salePriceCoverage.label}
        </p>
      ) : null}

      {data?.classifications && data.classifications.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400">
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Outcome</th>
                <th className="py-2 pr-3">Sale price</th>
                <th className="py-2">Conflict</th>
              </tr>
            </thead>
            <tbody>
              {data.classifications.slice(0, 10).map((row) => (
                <tr key={row.observationId} className="border-b border-slate-700/50">
                  <td className="py-2 pr-3 font-mono text-slate-400">
                    {row.observationId.slice(0, 8)}…
                  </td>
                  <td className="py-2 pr-3">{row.outcome}</td>
                  <td className="py-2 pr-3">
                    {row.salePrice != null
                      ? `R${Math.round(row.salePrice).toLocaleString("en-ZA")}`
                      : "Not supplied"}
                  </td>
                  <td className="py-2">{row.conflict ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
