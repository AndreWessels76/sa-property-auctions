"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type EventRow = {
  observationId: string;
  propertyLabel: string;
  agency: string | null;
  town: string | null;
  auctionDate?: string | null;
  queuePriority: number | null;
  primaryState: string;
  fetchState?: string;
  fetchAttempted: boolean;
  fetchSuccessful: boolean;
  snapshot: { exists: boolean; noChange: boolean };
  extraction: { state: string };
  outcomeState: string;
  salePriceState: string;
  retryRecommendation: string;
  stoppingPoint: string;
  source: { sourceUrl: string | null; sourceStatus: string };
  fetch: {
    httpStatus: number | null;
    errorCode?: string | null;
    attemptNumber?: number;
  } | null;
  acquisitionPriority?: {
    priority: number;
    reason: string;
    retryable: boolean;
    attempts: number;
  };
};

type FetchReliability = {
  fetchAttempts: number;
  fetchSuccesses: number;
  fetchFailures: number;
  retryableFailures: number;
  retryExhausted: number;
  permanentFailures: number;
  timeouts: number;
  tlsFailures: number;
  dnsFailures: number;
  rateLimited: number;
  contentUnusable: number;
};

type Dashboard = {
  ok?: boolean;
  error?: string;
  hsa49Version?: string;
  verdict?: string;
  reason?: string;
  connectivity?: { status: string; message: string };
  metrics?: Record<string, number>;
  fetchReliability?: FetchReliability;
  coverage?: Record<string, number>;
  failureBreakdown?: Record<string, number>;
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

export default function HistoricalSourceAcquisition49Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-source-coverage", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HSA 4.9 diagnostics");
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

  const events = useMemo(() => data?.events ?? [], [data?.events]);
  const m = data?.metrics;
  const fr = data?.fetchReliability;
  const cov = data?.coverage;

  return (
    <section className="mt-10 rounded-2xl border border-emerald-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Historical Source Acquisition 4.9</h2>
          <p className="mt-1 text-sm text-slate-300">
            Fetch reliability, bounded retries, and controlled acquisition — extends HSC 4.8 / HEA
            4.3.
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
          {pending ? "Working…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      {data?.verdict ? (
        <p className="mt-3 text-sm font-semibold text-emerald-200">
          Verdict: {data.verdict}
          {data.reason ? ` — ${data.reason}` : ""}
        </p>
      ) : null}

      {m && cov ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            <Stat label="Historical Events" value={m.historicalEvents ?? 0} />
            <Stat label="Licensed Sources" value={cov.sourceLicensed ?? 0} />
            <Stat label="Fetch Attempted" value={m.fetchAttempted ?? 0} />
            <Stat label="Fetch Successful" value={m.successfulFetches ?? 0} />
            <Stat label="Fetch Failed" value={m.failedFetches ?? 0} />
            <Stat label="Retryable" value={fr?.retryableFailures ?? m.retryableFailures ?? 0} />
            <Stat label="Retry Exhausted" value={fr?.retryExhausted ?? m.retryExhausted ?? 0} />
            <Stat label="Permanent Failure" value={fr?.permanentFailures ?? m.permanentFailures ?? 0} />
            <Stat label="Snapshots" value={m.snapshots ?? 0} />
            <Stat label="Extractions" value={m.extractionAttempted ?? 0} />
            <Stat label="Outcome Evidence" value={cov.outcomeEvidence ?? 0} />
            <Stat label="Verified SOLD" value={m.verifiedSold ?? 0} />
            <Stat label="Verified Sale Prices" value={m.verifiedSalePrices ?? 0} />
            <Stat label="Comparable Ready" value={m.comparableReady ?? 0} />
            <Stat label="Market Ready" value={m.marketReadyTowns ?? 0} />
            <Stat label="Catalogue Leaks" value={m.catalogueLeaks ?? 0} />
          </div>

          {data.failureBreakdown && Object.keys(data.failureBreakdown).length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Failure breakdown</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {Object.entries(data.failureBreakdown).map(([code, count]) => (
                  <span key={code} className="rounded bg-red-950/50 px-2 py-0.5 text-red-200">
                    {code}: {count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => post("dry_run", "Dry run P1")}
              className="rounded-lg bg-amber-700/80 px-3 py-1.5 text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              Dry Run (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("acquire_p1", "Acquire P1")}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              Acquire P1 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("retry_failed", "Retry failed")}
              className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-medium hover:bg-cyan-600 disabled:opacity-50"
            >
              Retry Failed (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("retry_network_failures", "Retry TLS/DNS/Timeout")}
              className="rounded-lg bg-cyan-800 px-3 py-1.5 text-xs font-medium hover:bg-cyan-700 disabled:opacity-50"
            >
              Retry TLS/DNS/Timeout (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("rebuild", "Rebuild intelligence")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              Rebuild Intelligence
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-600 text-slate-400">
                  <th className="p-2">Property</th>
                  <th className="p-2">Town</th>
                  <th className="p-2">Agency</th>
                  <th className="p-2">Source</th>
                  <th className="p-2">Priority</th>
                  <th className="p-2">Fetch Status</th>
                  <th className="p-2">Attempts</th>
                  <th className="p-2">Retryable?</th>
                  <th className="p-2">Snapshot</th>
                  <th className="p-2">Extraction</th>
                  <th className="p-2">Outcome</th>
                  <th className="p-2">Sale Price</th>
                  <th className="p-2">Next Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.observationId} className="border-b border-slate-700/50">
                    <td className="p-2">{e.propertyLabel}</td>
                    <td className="p-2">{e.town ?? "—"}</td>
                    <td className="p-2">{e.agency ?? "—"}</td>
                    <td className="p-2 max-w-[100px] truncate" title={e.source.sourceUrl ?? ""}>
                      {e.source.sourceStatus}
                    </td>
                    <td className="p-2">P{e.acquisitionPriority?.priority ?? e.queuePriority ?? "—"}</td>
                    <td className="p-2">
                      {e.fetchState ??
                        (e.fetch?.httpStatus != null
                          ? `HTTP ${e.fetch.httpStatus}`
                          : e.fetchAttempted
                            ? e.fetchSuccessful
                              ? "SUCCESS"
                              : e.fetch?.errorCode ?? "FAIL"
                            : "NOT_ATTEMPTED")}
                    </td>
                    <td className="p-2">{e.fetch?.attemptNumber ?? e.acquisitionPriority?.attempts ?? 0}</td>
                    <td className="p-2">
                      {e.acquisitionPriority?.retryable ? "Yes" : "No"}
                    </td>
                    <td className="p-2">
                      {e.snapshot.noChange ? "NO_CHANGE" : e.snapshot.exists ? "YES" : "NO"}
                    </td>
                    <td className="p-2">{e.extraction.state}</td>
                    <td className="p-2">{e.outcomeState}</td>
                    <td className="p-2">{e.salePriceState}</td>
                    <td className="p-2">{e.retryRecommendation}</td>
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
