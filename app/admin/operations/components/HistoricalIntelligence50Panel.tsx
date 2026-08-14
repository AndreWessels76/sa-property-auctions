"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type EventRow = {
  observationId: string;
  propertyLabel: string;
  town: string | null;
  agency: string | null;
  sourceUrl: string | null;
  recoveryPriority: number;
  evidenceState: string;
  httpStatus: number | null;
  errorCode: string | null;
  failureClassification: string;
  retryable: boolean;
  snapshot: boolean;
  extraction: string;
  outcome: string;
  salePrice: string;
  resolution: string | null;
  evidenceQuality: string | null;
  lastAttempt: string | null;
  nextAction: string;
};

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  verdict?: string;
  reason?: string;
  connectivity?: { status: string; message: string };
  coverageDashboard?: Record<string, number | string>;
  stateBreakdown?: Record<string, number>;
  recoveryPriorityCounts?: Record<string, number>;
  successRates?: Record<string, number | string>;
  bottleneck?: {
    primary: string;
    count: number;
    total: number;
    recommendedAction: string;
  };
  events?: EventRow[];
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-900/50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function HistoricalIntelligence50Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterState, setFilterState] = useState<string>("all");

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-intelligence50", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HI 5.0 dashboard");
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

  async function post(action: string, label: string) {
    if (pending) return;
    startTransition(async () => {
      toast.message(`${label}…`);
      try {
        const res = await fetch("/api/admin/intelligence/historical-intelligence50", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, limit: 5 }),
        });
        const json = await res.json();
        if (!json.ok) {
          toast.error(json.error ?? json.result?.message ?? `${label} failed`);
          return;
        }
        const delta = json.result?.beforeAfter?.deltaLines;
        toast.success(
          delta?.length
            ? `${json.result?.message ?? label} — ${delta.join(", ")}`
            : json.result?.message ?? `${label} complete`,
        );
        load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${label} failed`);
      }
    });
  }

  const filteredEvents = useMemo(() => {
    return (data?.events ?? []).filter((e) => {
      if (filterPriority !== "all" && String(e.recoveryPriority) !== filterPriority) {
        return false;
      }
      if (filterState !== "all" && e.evidenceState !== filterState) return false;
      return true;
    });
  }, [data?.events, filterPriority, filterState]);

  const cov = data?.coverageDashboard;
  const states = Object.keys(data?.stateBreakdown ?? {});

  return (
    <section className="mt-10 rounded-2xl border border-violet-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Historical Intelligence 5.0 — Verified Evidence Recovery
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Evidence chain diagnostics, recovery priority, bottleneck detection — extends HSC
            4.8 / HSA 4.9 / HEA 4.3.
          </p>
          {data?.version ? (
            <p className="mt-1 text-[11px] text-slate-500">{data.version}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          {pending ? "Working…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      {data?.verdict ? (
        <p className="mt-3 text-sm font-semibold text-violet-200">
          Verdict: {data.verdict}
          {data.reason ? ` — ${data.reason}` : ""}
        </p>
      ) : null}

      {data?.bottleneck ? (
        <div className="mt-3 rounded-lg border border-violet-900/50 bg-violet-950/30 p-3 text-xs">
          <p className="font-semibold text-violet-200">
            Primary bottleneck: {data.bottleneck.primary.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-slate-300">
            {data.bottleneck.count} / {data.bottleneck.total} events —{" "}
            {data.bottleneck.recommendedAction}
          </p>
        </div>
      ) : null}

      {cov ? (
        <>
          <p className="mt-4 text-xs font-semibold uppercase text-slate-400">
            Historical Evidence Coverage
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            <Stat label="Historical Events" value={cov.historicalEvents ?? 0} />
            <Stat label="Licensed Sources" value={cov.licensedSources ?? "—"} />
            <Stat label="Fetch Attempted" value={cov.fetchAttempted ?? "—"} />
            <Stat label="Never Attempted" value={cov.neverAttempted ?? 0} />
            <Stat label="Fetch Successful" value={cov.fetchSuccessful ?? 0} />
            <Stat label="Fetch Failed" value={cov.fetchFailed ?? 0} />
            <Stat label="Legacy Failures" value={cov.legacyFailuresRequiringRefetch ?? 0} />
            <Stat label="Snapshots" value={cov.snapshots ?? 0} />
            <Stat label="Extractions" value={cov.extractions ?? 0} />
            <Stat label="Outcome Evidence" value={cov.outcomeEvidence ?? 0} />
            <Stat label="Verified SOLD" value={cov.verifiedSold ?? 0} />
            <Stat label="SOLD Without Price" value={cov.soldWithoutPrice ?? 0} />
            <Stat label="Verified Sale Prices" value={cov.verifiedSalePrices ?? 0} />
            <Stat label="Comparable Ready" value={cov.comparableReady ?? 0} />
            <Stat label="Market Ready Towns" value={cov.marketReadyTowns ?? 0} />
            <Stat label="Catalogue Leaks" value={cov.catalogueLeaks ?? 0} />
          </div>

          {data.successRates ? (
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
              <span>
                Fetch success:{" "}
                {typeof data.successRates.fetchSuccessRate === "number"
                  ? `${data.successRates.fetchSuccessRate}%`
                  : "INSUFFICIENT_DATA"}
              </span>
              <span>
                Snapshot rate:{" "}
                {typeof data.successRates.snapshotRate === "number"
                  ? `${data.successRates.snapshotRate}%`
                  : "INSUFFICIENT_DATA"}
              </span>
              <span>
                Outcome evidence:{" "}
                {typeof data.successRates.outcomeEvidenceRate === "number"
                  ? `${data.successRates.outcomeEvidenceRate}%`
                  : "INSUFFICIENT_DATA"}
              </span>
            </div>
          ) : null}

          {data.stateBreakdown ? (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {Object.entries(data.stateBreakdown).map(([state, count]) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => setFilterState(state)}
                  className="rounded bg-slate-900/70 px-2 py-0.5 text-slate-300 hover:bg-slate-800"
                >
                  {state}: {count}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => post("dry_run_p1", "Dry run P1")}
              className="rounded-lg bg-amber-700/80 px-3 py-1.5 text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              Dry Run P1 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("acquire_p1", "Acquire P1")}
              className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium hover:bg-violet-600 disabled:opacity-50"
            >
              Acquire P1 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("retry_failed", "Retry failed")}
              className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-medium hover:bg-cyan-600 disabled:opacity-50"
            >
              Retry Failed
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("retry_network_failures", "Retry network")}
              className="rounded-lg bg-cyan-800 px-3 py-1.5 text-xs font-medium hover:bg-cyan-700 disabled:opacity-50"
            >
              Retry Network
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("extract_snapshots", "Extract snapshots")}
              className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-medium hover:bg-indigo-600 disabled:opacity-50"
            >
              Extract Snapshots (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("resolve_evidence", "Resolve evidence")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              Resolve Evidence
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("quality_audit", "Quality audit")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              Quality Audit
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("rebuild_intelligence", "Rebuild")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              Rebuild Intelligence
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-2">
              Priority
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="rounded bg-slate-900 px-2 py-1"
              >
                <option value="all">All</option>
                <option value="1">P1</option>
                <option value="2">P2</option>
                <option value="3">P3</option>
                <option value="4">P4</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Evidence state
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="rounded bg-slate-900 px-2 py-1"
              >
                <option value="all">All</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-600 text-slate-400">
                  <th className="p-2">Property</th>
                  <th className="p-2">Town</th>
                  <th className="p-2">Agency</th>
                  <th className="p-2">Source</th>
                  <th className="p-2">Priority</th>
                  <th className="p-2">Fetch State</th>
                  <th className="p-2">HTTP</th>
                  <th className="p-2">Retryable</th>
                  <th className="p-2">Snapshot</th>
                  <th className="p-2">Extraction</th>
                  <th className="p-2">Outcome</th>
                  <th className="p-2">Sale Price</th>
                  <th className="p-2">Resolution</th>
                  <th className="p-2">Quality</th>
                  <th className="p-2">Next Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((e) => (
                  <tr key={e.observationId} className="border-b border-slate-700/50">
                    <td className="p-2">{e.propertyLabel}</td>
                    <td className="p-2">{e.town ?? "—"}</td>
                    <td className="p-2">{e.agency ?? "—"}</td>
                    <td className="p-2 max-w-[90px] truncate" title={e.sourceUrl ?? ""}>
                      {e.sourceUrl ? "Licensed" : "—"}
                    </td>
                    <td className="p-2">P{e.recoveryPriority}</td>
                    <td className="p-2">{e.evidenceState}</td>
                    <td className="p-2">
                      {e.httpStatus ?? (e.failureClassification === "LEGACY_UNKNOWN_FAILURE" ? "LEGACY" : "—")}
                    </td>
                    <td className="p-2">{e.retryable ? "Yes" : "No"}</td>
                    <td className="p-2">{e.snapshot ? "YES" : "NO"}</td>
                    <td className="p-2">{e.extraction}</td>
                    <td className="p-2">{e.outcome}</td>
                    <td className="p-2">{e.salePrice}</td>
                    <td className="p-2">{e.resolution ?? "—"}</td>
                    <td className="p-2">{e.evidenceQuality ?? "—"}</td>
                    <td className="p-2">{e.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
