"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Coverage = {
  totalHistoricalEvents?: number;
  confirmedOutcomes?: number;
  unknownOutcomes?: number;
  verifiedSalePrices?: number;
  comparableReadyEvents?: number;
  marketStatisticsReadyEvents?: number;
  insufficientDataCases?: number;
  averageOverallConfidence?: string;
};

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  coverage?: Coverage;
  queueSummary?: {
    total: number;
    priority1: number;
    eligible: number;
  };
  openConflicts?: number;
  conflicts?: Array<{ id: string; claim_a: string; claim_b: string; status: string }>;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-900/50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function HistoricalIntelligence40Panel() {
  const [coverage, setCoverage] = useState<Dashboard | null>(null);
  const [conflicts, setConflicts] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const [covRes, conRes] = await Promise.all([
          fetch("/api/admin/intelligence/historical/coverage", { cache: "no-store" }),
          fetch("/api/admin/intelligence/historical/conflicts", { cache: "no-store" }),
        ]);
        const cov = (await covRes.json()) as Dashboard;
        const con = (await conRes.json()) as Dashboard;
        if (!cov.ok) {
          setError(cov.error ?? "Failed to load coverage");
          return;
        }
        setError(null);
        setCoverage(cov);
        setConflicts(con);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function rebuild() {
    if (pending) return;
    startTransition(async () => {
      toast.message("Rebuilding historical intelligence…");
      try {
        const res = await fetch("/api/admin/intelligence/historical/rebuild", {
          method: "POST",
        });
        const json = await res.json();
        if (!json.ok) toast.error(json.error ?? "Rebuild failed");
        else {
          toast.success(json.message ?? "Rebuild complete");
          load();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Rebuild failed");
      }
    });
  }

  async function resolveConflict(id: string, action: "confirm_a" | "confirm_b" | "reject") {
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conflictId: id, action }),
        });
        const json = await res.json();
        if (!json.ok) toast.error(json.error ?? "Resolution failed");
        else {
          toast.success("Conflict updated");
          load();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Resolution failed");
      }
    });
  }

  const c = coverage?.coverage;

  return (
    <section className="mt-10 rounded-2xl border border-indigo-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Historical Intelligence 4.0</h2>
          <p className="mt-1 text-sm text-slate-300">
            Market evidence, comparable sales, and historical performance — evidence-backed only.
          </p>
          {coverage?.version ? (
            <p className="mt-1 text-[11px] text-slate-500">{coverage.version}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={pending}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
          >
            {pending ? "Working…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => void rebuild()}
            disabled={pending}
            className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-medium hover:bg-indigo-600 disabled:opacity-50"
          >
            Rebuild intelligence
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-amber-300">{error}</p> : null}

      {c ? (
        <>
          <h3 className="mt-4 text-sm font-semibold text-slate-300">Evidence coverage</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            <Stat label="Historical events" value={c.totalHistoricalEvents ?? 0} />
            <Stat label="Confirmed outcomes" value={c.confirmedOutcomes ?? 0} />
            <Stat label="Unknown outcomes" value={c.unknownOutcomes ?? 0} />
            <Stat label="Verified sale prices" value={c.verifiedSalePrices ?? 0} />
            <Stat label="Comparable-ready" value={c.comparableReadyEvents ?? 0} />
            <Stat label="Market-stats-ready" value={c.marketStatisticsReadyEvents ?? 0} />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Average evidence confidence: {c.averageOverallConfidence ?? "INSUFFICIENT"} ·{" "}
            {c.insufficientDataCases ?? 0} insufficient-data cases
          </p>
        </>
      ) : null}

      {coverage?.queueSummary ? (
        <p className="mt-3 text-xs text-slate-400">
          Acquisition queue (HDA 4.0): {coverage.queueSummary.eligible} eligible · P1{" "}
          {coverage.queueSummary.priority1}
        </p>
      ) : null}

      {conflicts?.conflicts && conflicts.conflicts.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">
            Conflicts ({conflicts.openConflicts ?? 0})
          </h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400">
                <th className="py-2 pr-3">Claim A</th>
                <th className="py-2 pr-3">Claim B</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {conflicts.conflicts.slice(0, 6).map((row) => (
                <tr key={row.id} className="border-b border-slate-700/50">
                  <td className="py-2 pr-3">{row.claim_a}</td>
                  <td className="py-2 pr-3">{row.claim_b}</td>
                  <td className="py-2 space-x-1">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void resolveConflict(row.id, "confirm_a")}
                      className="rounded bg-slate-700 px-2 py-0.5 disabled:opacity-50"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void resolveConflict(row.id, "confirm_b")}
                      className="rounded bg-slate-700 px-2 py-0.5 disabled:opacity-50"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void resolveConflict(row.id, "reject")}
                      className="rounded bg-red-900/60 px-2 py-0.5 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
