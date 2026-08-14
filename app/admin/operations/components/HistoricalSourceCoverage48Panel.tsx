"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type EventRow = {
  observationId: string;
  propertyLabel: string;
  agency: string | null;
  town: string | null;
  queuePriority: number | null;
  primaryState: string;
  fetchState?: string;
  fetchAttempted: boolean;
  fetchSuccessful: boolean;
  snapshot: { exists: boolean; noChange: boolean; valid?: boolean | null };
  extraction: { state: string };
  outcomeState: string;
  salePriceState: string;
  evidenceQuality: string | null;
  retryRecommendation: string;
  stoppingPoint: string;
  source: { sourceUrl: string | null; sourceStatus: string };
  fetch: { httpStatus: number | null; errorCode?: string | null; attemptNumber?: number } | null;
  acquisitionPriority?: { priority: number; reason: string; retryable: boolean; attempts: number };
};

type SourceHealth = {
  partner: string;
  eligible: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  successRate: number | null;
  snapshotCoverage: number;
  extractionCoverage: number;
  outcomeCoverage: number;
  salePriceCoverage: number;
  httpErrorDistribution: Record<string, number>;
};

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  hsa49Version?: string;
  verdict?: string;
  reason?: string;
  connectivity?: { status: string; message: string; extendedStatus?: string };
  metrics?: Record<string, number>;
  coverage?: {
    total: number;
    sourceFound: number;
    fetchAttempted: number;
    fetchSuccessful: number;
    snapshots: number;
    extractions: number;
    outcomeEvidence: number;
    salePriceEvidence: number;
  };
  stateBreakdown?: Record<string, number>;
  failureBreakdown?: Record<string, number>;
  gapGroups?: Record<string, number>;
  sourceHealth?: SourceHealth[];
  events?: EventRow[];
  provenInProduction?: string[];
  technicalBlockers?: string[];
  adminReviewRequired?: string[];
  dataStillMissing?: string[];
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-900/50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function HistoricalSourceCoverage48Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterState, setFilterState] = useState<string>("all");

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-source-coverage", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HSC 4.8 diagnostics");
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
        const res = await fetch("/api/admin/intelligence/historical-source-coverage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, limit: 5 }),
        });
        const json = await res.json();
        if (!json.ok) {
          toast.error(json.error ?? json.result?.message ?? `${label} failed`);
          return;
        }
        toast.success(json.result?.message ?? `${label} complete`);
        load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${label} failed`);
      }
    });
  }

  const filteredEvents = useMemo(() => {
    const events = data?.events ?? [];
    return events.filter((e) => {
      if (filterPriority !== "all" && String(e.queuePriority) !== filterPriority) return false;
      if (filterState !== "all") {
        const matchesState = e.primaryState === filterState;
        const matchesError = e.fetch?.errorCode === filterState;
        if (!matchesState && !matchesError) return false;
      }
      return true;
    });
  }, [data?.events, filterPriority, filterState]);

  const m = data?.metrics;
  const cov = data?.coverage;
  const states = Object.keys(data?.stateBreakdown ?? {});

  return (
    <section className="mt-10 rounded-2xl border border-cyan-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Historical Source Coverage &amp; Acquisition Diagnostics 4.8 / 4.9
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Fetch reliability, retry policy, source health — extends HEA 4.3 pipeline. No parallel
            engine.
          </p>
          {data?.hsa49Version ? (
            <p className="mt-1 text-[11px] text-slate-500">{data.hsa49Version}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          {pending ? "Working…" : "Refresh diagnostics"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      {data?.connectivity ? (
        <p
          className={`mt-3 text-xs ${
            data.connectivity.status === "CONNECTED" ? "text-emerald-400" : "text-amber-300"
          }`}
        >
          Connectivity: {data.connectivity.status} — {data.connectivity.message}
        </p>
      ) : null}

      {data?.verdict ? (
        <p className="mt-2 text-sm font-semibold text-cyan-200">
          Verdict: {data.verdict}
          {data.reason ? ` — ${data.reason}` : ""}
        </p>
      ) : null}

      {m && cov ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            <Stat label="Property Masters" value={m.propertyMasters ?? 0} />
            <Stat label="Auction Events" value={m.auctionEvents ?? 0} />
            <Stat label="Historical Events" value={m.historicalEvents ?? 0} />
            <Stat label="P1 eligible" value={m.p1Eligible ?? m.p1 ?? 0} />
            <Stat label="P2 retryable" value={m.p2Retryable ?? m.p2 ?? 0} />
            <Stat label="P3 review" value={m.p3Review ?? m.p3 ?? 0} />
            <Stat label="P4 blocked" value={m.p4Blocked ?? m.p4 ?? 0} />
            <Stat label="Enrichment attempts" value={m.enrichmentAttempts ?? 0} />
            <Stat label="Successful fetches" value={m.successfulFetches ?? 0} />
            <Stat label="Failed fetches" value={m.failedFetches ?? 0} />
            <Stat label="Snapshots" value={m.snapshots ?? 0} />
            <Stat label="No-change" value={m.noChange ?? 0} />
            <Stat label="TLS errors" value={m.tlsErrors ?? 0} />
            <Stat label="HTTP 404" value={m.http404 ?? 0} />
            <Stat label="Verified SOLD" value={m.verifiedSold ?? 0} />
            <Stat label="Verified sale prices" value={m.verifiedSalePrices ?? 0} />
            <Stat label="Conflicts" value={m.conflicts ?? 0} />
            <Stat label="Review required" value={m.reviewRequired ?? 0} />
            <Stat label="Retryable failures" value={m.retryableFailures ?? 0} />
            <Stat label="Acquisition gaps" value={m.acquisitionGaps ?? 0} />
            <Stat label="Catalogue leaks" value={m.catalogueLeaks ?? 0} />
          </div>

          {data.failureBreakdown && Object.keys(data.failureBreakdown).length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Fetch failure breakdown</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {Object.entries(data.failureBreakdown).map(([code, count]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setFilterState(code)}
                    className="rounded bg-red-950/50 px-2 py-0.5 text-red-200 hover:bg-red-900/50"
                  >
                    {code}: {count}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {data.sourceHealth && data.sourceHealth.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <p className="text-xs font-semibold uppercase text-slate-400">Source health</p>
              <table className="mt-2 w-full min-w-[600px] text-left text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="p-2">Partner</th>
                    <th className="p-2">Eligible</th>
                    <th className="p-2">Attempted</th>
                    <th className="p-2">Success</th>
                    <th className="p-2">Rate</th>
                    <th className="p-2">Snapshots</th>
                    <th className="p-2">Outcomes</th>
                    <th className="p-2">Sale prices</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sourceHealth.map((s) => (
                    <tr key={s.partner} className="border-t border-slate-700/50">
                      <td className="p-2">{s.partner}</td>
                      <td className="p-2">{s.eligible}</td>
                      <td className="p-2">{s.fetchAttempted}</td>
                      <td className="p-2">{s.fetchSuccessful}</td>
                      <td className="p-2">{s.successRate != null ? `${s.successRate}%` : "—"}</td>
                      <td className="p-2">{s.snapshotCoverage}</td>
                      <td className="p-2">{s.outcomeCoverage}</td>
                      <td className="p-2">{s.salePriceCoverage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
            <p>
              Source coverage: {cov.sourceFound}/{cov.total}
            </p>
            <p>
              Fetch coverage: {cov.fetchAttempted}/{cov.total}
            </p>
            <p>
              Snapshot coverage: {cov.snapshots}/{cov.total}
            </p>
            <p>
              Extraction coverage: {cov.extractions}/{cov.total}
            </p>
            <p>
              Outcome evidence: {cov.outcomeEvidence}/{cov.total}
            </p>
            <p>
              Sale price evidence: {cov.salePriceEvidence}/{cov.total}
            </p>
          </div>

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
              onClick={() => post("refresh_diagnostics", "Refresh diagnostics")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              Refresh diagnostics
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("dry_run_p1", "Dry run P1")}
              className="rounded-lg bg-amber-700/80 px-3 py-1.5 text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              Dry run P1 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("acquire_p1", "Acquire P1")}
              className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-medium hover:bg-cyan-600 disabled:opacity-50"
            >
              Acquire P1 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("rebuild_intelligence", "Rebuild intelligence")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              Rebuild intelligence
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs">
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
              Diagnostic state
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

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-600 text-slate-400">
                  <th className="p-2">Event</th>
                  <th className="p-2">Property</th>
                  <th className="p-2">Source</th>
                  <th className="p-2">Fetch</th>
                  <th className="p-2">Snapshot</th>
                  <th className="p-2">Extraction</th>
                  <th className="p-2">Outcome</th>
                  <th className="p-2">Sale Price</th>
                  <th className="p-2">Quality</th>
                  <th className="p-2">Next Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((e) => (
                  <tr key={e.observationId} className="border-b border-slate-700/50">
                    <td className="p-2">{e.town ?? "—"}</td>
                    <td className="p-2">{e.propertyLabel}</td>
                    <td className="p-2 max-w-[120px] truncate" title={e.source.sourceUrl ?? ""}>
                      {e.agency ?? e.source.sourceStatus}
                    </td>
                    <td className="p-2">
                      {e.fetch?.httpStatus != null
                        ? `HTTP ${e.fetch.httpStatus}`
                        : e.fetchAttempted
                          ? e.fetchSuccessful
                            ? "OK"
                            : "FAIL"
                          : "—"}
                    </td>
                    <td className="p-2">
                      {e.snapshot.noChange
                        ? "NO_CHANGE"
                        : e.snapshot.exists
                          ? "YES"
                          : "NO"}
                    </td>
                    <td className="p-2">{e.extraction.state}</td>
                    <td className="p-2">{e.outcomeState}</td>
                    <td className="p-2">{e.salePriceState}</td>
                    <td className="p-2">{e.evidenceQuality ?? "—"}</td>
                    <td className="p-2">{e.retryRecommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.technicalBlockers && data.technicalBlockers.length > 0 ? (
            <div className="mt-4 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-xs text-red-100">
              <p className="font-semibold uppercase tracking-wide text-red-300">
                Technical blockers
              </p>
              <ul className="mt-1 list-inside list-disc">
                {data.technicalBlockers.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.dataStillMissing && data.dataStillMissing.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-800/50 bg-amber-950/30 p-3 text-xs text-amber-100">
              <p className="font-semibold uppercase tracking-wide text-amber-300">
                Data still missing
              </p>
              <ul className="mt-1 list-inside list-disc">
                {data.dataStillMissing.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
