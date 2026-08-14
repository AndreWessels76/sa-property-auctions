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

type P1BatchSlot = {
  batchNumber: number;
  processed: number;
  remaining: number;
  status: "completed" | "planned" | "next";
};

type BatchHistoryRecord = {
  batchId: string;
  action: string;
  operator: string | null;
  started: string | null;
  completed: string | null;
  eventsSelected: number;
  eventsSucceeded: number;
  eventsFailed: number;
  snapshotsCreated: number;
  outcomesExtracted: number;
  pricesVerified: number;
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
  chainSuccessRates?: Record<string, number | string>;
  bottleneck?: {
    primary: string;
    count: number;
    total: number;
    recommendedAction: string;
  };
  p1Progress?: {
    originalCandidates: number;
    processed: number;
    remaining: number;
    batchSize: number;
    batches: P1BatchSlot[];
  };
  fetchResults?: {
    attempted: number;
    successful: number;
    failed: number;
    retryable: number;
    permanent: number;
    legacy: number;
  };
  batchHistory?: BatchHistoryRecord[];
  legacyRecoveryCandidates?: number;
  missingExtractionCandidates?: number;
  p4ReviewCount?: number;
  investorLabels?: {
    proven: string[];
    tested: string[];
    missing: string[];
    reviewRequired: string[];
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

function formatRate(value: number | string | undefined): string {
  if (value === undefined) return "INSUFFICIENT_DATA";
  if (typeof value === "number") return `${value}%`;
  return String(value);
}

export default function HistoricalIntelligence51Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterState, setFilterState] = useState<string>("all");
  const [dryRunPreview, setDryRunPreview] = useState<unknown[] | null>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-intelligence51", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HI 5.1 dashboard");
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

  async function post(action: string, label: string, dryRunOnly = false) {
    if (pending) return;
    startTransition(async () => {
      toast.message(`${label}…`);
      try {
        const res = await fetch("/api/admin/intelligence/historical-intelligence51", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, limit: 5 }),
        });
        const json = await res.json();
        if (!json.ok) {
          toast.error(json.error ?? json.result?.message ?? `${label} failed`);
          return;
        }
        const delta = json.result?.beforeAfter?.delta?.lines;
        if (dryRunOnly && json.result?.candidates) {
          setDryRunPreview(json.result.candidates);
        }
        toast.success(
          delta?.length
            ? `${json.result?.message ?? label} — ${delta.join(", ")}`
            : json.result?.message ?? `${label} complete`,
        );
        if (!dryRunOnly) load();
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

  const p4Events = useMemo(
    () => (data?.events ?? []).filter((e) => e.recoveryPriority === 4),
    [data?.events],
  );

  const cov = data?.coverageDashboard;
  const states = Object.keys(data?.stateBreakdown ?? {});
  const chain = data?.chainSuccessRates;

  return (
    <section className="mt-10 rounded-2xl border border-emerald-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Historical Intelligence 5.1 — Controlled Evidence Recovery
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Phased P1 recovery (5 per batch), legacy failure retry, snapshot extraction — extends
            HI 5.0 / HSC 4.8 / HSA 4.9.
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
        <p className="mt-3 text-sm font-semibold text-emerald-200">
          Verdict: {data.verdict}
          {data.reason ? ` — ${data.reason}` : ""}
        </p>
      ) : null}

      {data?.bottleneck ? (
        <div className="mt-3 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3 text-xs">
          <p className="font-semibold text-emerald-200">
            Primary bottleneck: {data.bottleneck.primary.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-slate-300">
            {data.bottleneck.count} / {data.bottleneck.total} events —{" "}
            {data.bottleneck.recommendedAction}
          </p>
        </div>
      ) : null}

      {data?.p1Progress ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs">
          <p className="font-semibold text-slate-200">P1 Recovery Progress</p>
          <p className="mt-1 text-slate-400">
            {data.p1Progress.originalCandidates} candidates — {data.p1Progress.processed}{" "}
            processed, {data.p1Progress.remaining} remaining (batch size{" "}
            {data.p1Progress.batchSize})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.p1Progress.batches.map((b) => (
              <span
                key={b.batchNumber}
                className={`rounded px-2 py-0.5 ${
                  b.status === "next"
                    ? "bg-amber-900/60 text-amber-200"
                    : b.status === "completed"
                      ? "bg-emerald-900/40 text-emerald-200"
                      : "bg-slate-800 text-slate-400"
                }`}
              >
                Batch {b.batchNumber}: {b.processed}/{data.p1Progress!.batchSize} — remaining{" "}
                {b.remaining}
              </span>
            ))}
          </div>
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
            <Stat label="Successful Fetches" value={cov.fetchSuccessful ?? 0} />
            <Stat label="Failed Fetches" value={cov.fetchFailed ?? 0} />
            <Stat label="Legacy Failures" value={cov.legacyFailuresRequiringRefetch ?? 0} />
            <Stat label="Snapshots" value={`${cov.snapshots ?? 0}/${cov.historicalEvents ?? 0}`} />
            <Stat
              label="Extractions"
              value={`${cov.extractions ?? 0}/${cov.historicalEvents ?? 0}`}
            />
            <Stat
              label="Outcome Evidence"
              value={`${cov.outcomeEvidence ?? 0}/${cov.historicalEvents ?? 0}`}
            />
            <Stat label="Verified SOLD" value={cov.verifiedSold ?? 0} />
            <Stat label="SOLD Without Price" value={cov.soldWithoutPrice ?? 0} />
            <Stat label="Verified Sale Prices" value={cov.verifiedSalePrices ?? 0} />
            <Stat label="Comparable Ready" value={cov.comparableReady ?? 0} />
            <Stat label="Market Ready Towns" value={cov.marketReadyTowns ?? 0} />
            <Stat label="Catalogue Leaks" value={cov.catalogueLeaks ?? 0} />
          </div>

          {data.fetchResults ? (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
              <span>Attempted: {data.fetchResults.attempted}</span>
              <span>Successful: {data.fetchResults.successful}</span>
              <span>Failed: {data.fetchResults.failed}</span>
              <span>Retryable: {data.fetchResults.retryable}</span>
              <span>Permanent: {data.fetchResults.permanent}</span>
              <span>Legacy: {data.fetchResults.legacy}</span>
            </div>
          ) : null}

          {chain ? (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
              <span>Fetch success: {formatRate(chain.fetchSuccessRate)}</span>
              <span>Snapshot rate: {formatRate(chain.snapshotRate)}</span>
              <span>Extraction rate: {formatRate(chain.extractionRate)}</span>
              <span>Outcome evidence: {formatRate(chain.outcomeEvidenceRate)}</span>
              <span>Sale price rate: {formatRate(chain.salePriceRate)}</span>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => post("dry_run_p1", "Dry Run P1 (5)", true)}
              className="rounded-lg bg-amber-700/80 px-3 py-1.5 text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              Dry Run P1 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("acquire_p1", "Acquire P1 (5)")}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              Acquire P1 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("dry_run_legacy", "Dry Run Legacy (5)", true)}
              className="rounded-lg bg-amber-800/80 px-3 py-1.5 text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              Dry Run Legacy (5)
            </button>
            <button
              type="button"
              disabled={pending || (data.legacyRecoveryCandidates ?? 0) === 0}
              onClick={() => post("retry_legacy_failures", "Retry Legacy Failures (5)")}
              className="rounded-lg bg-orange-700 px-3 py-1.5 text-xs font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              Retry Legacy Failures (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("retry_failed", "Retry Failed")}
              className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-medium hover:bg-cyan-600 disabled:opacity-50"
            >
              Retry Failed (P2)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("extract_snapshots", "Extract Snapshots (5)")}
              className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-medium hover:bg-indigo-600 disabled:opacity-50"
            >
              Extract Existing Snapshots (5)
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
              Quality Audit (HEQ 4.4)
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

          {dryRunPreview && dryRunPreview.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
              <p className="text-xs font-semibold text-amber-200">Dry Run Preview (no writes)</p>
              <table className="mt-2 w-full min-w-[900px] text-left text-[11px]">
                <thead>
                  <tr className="text-slate-400">
                    <th className="p-1">Event</th>
                    <th className="p-1">Property</th>
                    <th className="p-1">Master</th>
                    <th className="p-1">Town</th>
                    <th className="p-1">Source</th>
                    <th className="p-1">State</th>
                    <th className="p-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dryRunPreview.map((row, i) => {
                    const r = row as Record<string, unknown>;
                    return (
                      <tr key={i} className="border-t border-slate-700/50">
                        <td className="p-1">{String(r.eventId ?? r.observationId ?? "—")}</td>
                        <td className="p-1">{String(r.propertyLabel ?? "—")}</td>
                        <td className="p-1">{String(r.propertyMasterId ?? "—")}</td>
                        <td className="p-1">{String(r.town ?? "—")}</td>
                        <td className="p-1 max-w-[120px] truncate" title={String(r.sourceUrl ?? "")}>
                          {String(r.source ?? "—")}
                        </td>
                        <td className="p-1">{String(r.currentState ?? "—")}</td>
                        <td className="p-1">{String(r.expectedAction ?? "—")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {data.batchHistory && data.batchHistory.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <p className="text-xs font-semibold uppercase text-slate-400">Batch History</p>
              <table className="mt-2 w-full min-w-[800px] text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400">
                    <th className="p-2">Batch ID</th>
                    <th className="p-2">Action</th>
                    <th className="p-2">Started</th>
                    <th className="p-2">Selected</th>
                    <th className="p-2">Succeeded</th>
                    <th className="p-2">Failed</th>
                    <th className="p-2">Snapshots</th>
                    <th className="p-2">Outcomes</th>
                    <th className="p-2">Prices</th>
                  </tr>
                </thead>
                <tbody>
                  {data.batchHistory.map((b) => (
                    <tr key={b.batchId} className="border-b border-slate-700/50">
                      <td className="p-2 font-mono text-[10px]">{b.batchId}</td>
                      <td className="p-2">{b.action}</td>
                      <td className="p-2">{b.started ?? "—"}</td>
                      <td className="p-2">{b.eventsSelected}</td>
                      <td className="p-2">{b.eventsSucceeded}</td>
                      <td className="p-2">{b.eventsFailed}</td>
                      <td className="p-2">{b.snapshotsCreated}</td>
                      <td className="p-2">{b.outcomesExtracted}</td>
                      <td className="p-2">{b.pricesVerified}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {(data.p4ReviewCount ?? 0) > 0 ? (
            <div className="mt-4 rounded-lg border border-red-900/40 bg-red-950/20 p-3">
              <p className="text-xs font-semibold text-red-200">
                P4 Review Required ({data.p4ReviewCount} records — never hidden)
              </p>
              <table className="mt-2 w-full text-left text-[11px]">
                <thead>
                  <tr className="text-slate-400">
                    <th className="p-1">Property</th>
                    <th className="p-1">Source</th>
                    <th className="p-1">HTTP</th>
                    <th className="p-1">State</th>
                    <th className="p-1">Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {p4Events.map((e) => (
                    <tr key={e.observationId} className="border-t border-slate-700/50">
                      <td className="p-1">{e.propertyLabel}</td>
                      <td className="p-1 max-w-[100px] truncate" title={e.sourceUrl ?? ""}>
                        {e.sourceUrl ? "Licensed" : "—"}
                      </td>
                      <td className="p-1">
                        {e.httpStatus ??
                          (e.failureClassification === "LEGACY_UNKNOWN_FAILURE" ? "LEGACY" : "—")}
                      </td>
                      <td className="p-1">{e.evidenceState}</td>
                      <td className="p-1">{e.nextAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {data.investorLabels ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[11px]">
              {(["proven", "tested", "missing", "reviewRequired"] as const).map((key) => (
                <div key={key} className="rounded bg-slate-900/50 p-2">
                  <p className="font-semibold uppercase text-slate-400">{key}</p>
                  <ul className="mt-1 list-inside list-disc text-slate-300">
                    {(data.investorLabels![key] ?? []).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

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
                      {e.httpStatus ??
                        (e.failureClassification === "LEGACY_UNKNOWN_FAILURE" ? "LEGACY" : "—")}
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
