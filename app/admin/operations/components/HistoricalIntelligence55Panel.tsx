"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type FunnelStep = { key: string; label: string; value: number };

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  verdict?: string;
  reason?: string;
  campaign55?: {
    status: string;
    summaryLine: string;
    dataCoverageImproving?: boolean;
    dataCoverageReady?: boolean;
  };
  p1Progress55?: {
    originalP1: number;
    processed: number;
    remaining: number;
    blocked: number;
    successful: number;
    failed: number;
    retryable: number;
    reviewRequired: number;
    progressBar: string;
    progressLabel: string;
  };
  batchPlan55?: {
    remaining: number;
    batchSize: number;
    batchesRequired: number;
    note: string;
  };
  recoveryLanes55?: {
    neverAttempted: number;
    legacyUnknownFailures: number;
    retryableFailures: number;
    snapshotExtractionPending: number;
    note: string;
  };
  evidenceFunnel55?: FunnelStep[];
  bottleneck55?: {
    code: string;
    count: number;
    total: number;
    percentage: number;
    recommendedAction: string;
  };
  safety55?: {
    catalogueLeaks: number;
    catalogueSafe: boolean;
    rebuildStatus: string;
  };
  coverage52?: Record<string, number | string>;
  nextAdminAction?: string;
};

function displayMetric(value: number | string | undefined | null): string {
  if (value == null) return "DATA UNAVAILABLE";
  return String(value);
}

export default function HistoricalIntelligence55Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dryRunPreview, setDryRunPreview] = useState<unknown[] | null>(null);
  const [lastDelta, setLastDelta] = useState<string[] | null>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-intelligence55", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HI 5.5 dashboard");
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

  async function post(
    action: string,
    label: string,
    opts?: { dryRun?: boolean; confirm?: boolean },
  ) {
    if (pending) return;
    if (opts?.confirm !== false && !opts?.dryRun) {
      const ok = window.confirm(
        `${label}\n\nBatch size: 5\nThis writes production recovery state.\nContinue?`,
      );
      if (!ok) return;
    }

    startTransition(async () => {
      toast.message(`${label}…`);
      try {
        const res = await fetch("/api/admin/intelligence/historical-intelligence55", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, limit: 5 }),
        });
        const json = await res.json();
        if (!json.ok && !json.result?.ok) {
          toast.error(json.error ?? json.result?.message ?? `${label} failed`);
          if (json.result?.blocked) setLastDelta([json.result.message]);
          return;
        }
        if (opts?.dryRun && json.result?.candidates) {
          setDryRunPreview(json.result.candidates);
        }
        const lines =
          (json.result?.p1RemainingLines as string[] | undefined) ??
          (json.result?.explicitDelta?.lines as string[] | undefined) ??
          (json.result?.beforeAfterDisplay
            ? [
                "Before",
                ...(json.result.beforeAfterDisplay.beforeLines as string[]),
                "After",
                ...(json.result.beforeAfterDisplay.afterLines as string[]),
              ]
            : undefined);
        if (lines) setLastDelta(lines);
        toast.success(json.result?.message ?? `${label} complete`);
        if (!opts?.dryRun) load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${label} failed`);
      }
    });
  }

  const p1 = data?.p1Progress55;
  const funnel = data?.evidenceFunnel55 ?? [];
  const cov = data?.coverage52;
  const lanes = data?.recoveryLanes55;

  return (
    <section className="mt-10 rounded-2xl border border-emerald-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Historical Intelligence 5.5 — Controlled Evidence Recovery
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Coverage expansion over HI 5.4 — max batch 5. Never auto-process all P1. No fabricated
            SOLD or sale prices.
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-xs">
          <p className="font-semibold text-slate-300">ENGINE STATUS</p>
          <p className="mt-1 text-lg font-bold text-emerald-200">READY</p>
          <p className="mt-1 text-slate-400">
            Admin-triggered acquisition only — dry run is read-only.
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-xs">
          <p className="font-semibold text-slate-300">DATA COVERAGE</p>
          <p className="mt-1 text-lg font-bold text-amber-200">
            {data?.campaign55?.dataCoverageReady
              ? "DATA COVERAGE READY"
              : data?.campaign55?.dataCoverageImproving
                ? "IMPROVING"
                : "INSUFFICIENT"}
          </p>
          <p className="mt-1 text-slate-400">
            Verified sale prices: {displayMetric(cov?.verifiedSalePrices)} · Comparables:{" "}
            {displayMetric(cov?.comparableReady)} · Market-ready towns:{" "}
            {displayMetric(cov?.marketReadyTowns)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-4">
        <p className="text-sm font-semibold text-emerald-100">Campaign</p>
        <p className="mt-1 text-xs text-slate-300">
          Status: {displayMetric(data?.campaign55?.status)}
        </p>
        {p1 ? (
          <>
            <p className="mt-2 font-mono text-sm tracking-wider text-emerald-200">
              P1 Progress [{p1.progressBar}] {p1.progressLabel}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Original P1: {p1.originalP1} · Processed: {p1.processed} · Remaining: {p1.remaining} ·
              Successful: {p1.successful} · Failed: {p1.failed}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-amber-200">DATA UNAVAILABLE</p>
        )}
        {data?.batchPlan55 ? (
          <p className="mt-1 text-[11px] text-slate-400">
            Batch plan: {data.batchPlan55.batchesRequired} × ≤{data.batchPlan55.batchSize} —{" "}
            {data.batchPlan55.note}
          </p>
        ) : null}
        {data?.campaign55?.summaryLine ? (
          <p className="mt-1 text-[11px] text-slate-400">{data.campaign55.summaryLine}</p>
        ) : null}
      </div>

      {lanes ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
          {(
            [
              ["Never Attempted (P1)", lanes.neverAttempted],
              ["Legacy Unknown", lanes.legacyUnknownFailures],
              ["Retryable Failures", lanes.retryableFailures],
              ["Snapshot → Extract", lanes.snapshotExtractionPending],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded border border-slate-700 bg-slate-900/50 px-2 py-1.5">
              <p className="text-slate-500">{label}</p>
              <p className="font-mono text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {data?.bottleneck55 ? (
        <div className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-xs">
          <p className="font-semibold text-amber-200">PRIMARY BOTTLENECK</p>
          <p className="mt-1 text-slate-200">{data.bottleneck55.code.replace(/_/g, " ")}</p>
          <p className="mt-1 text-slate-300">
            {data.bottleneck55.count} / {data.bottleneck55.total} ({data.bottleneck55.percentage}%)
          </p>
          <p className="mt-1 text-emerald-200">
            Recommended: {data.bottleneck55.recommendedAction}
          </p>
          {data.nextAdminAction ? (
            <p className="mt-1 text-slate-400">Next: {data.nextAdminAction}</p>
          ) : null}
        </div>
      ) : null}

      {funnel.length > 0 ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs font-semibold uppercase text-slate-400">Evidence Funnel</p>
          <div className="mt-2 space-y-1 font-mono text-xs text-slate-200">
            {funnel.map((step, i) => (
              <div key={step.key}>
                {i > 0 ? <div className="pl-6 text-slate-600">↓</div> : null}
                <div>
                  {step.value} {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs">
        <p className="font-semibold text-slate-300">Production Safety</p>
        <p className="mt-1 text-slate-400">
          Catalogue leaks: {displayMetric(data?.safety55?.catalogueLeaks)} · Rebuild:{" "}
          {displayMetric(data?.safety55?.rebuildStatus)}
        </p>
        {data?.safety55 && data.safety55.catalogueLeaks > 0 ? (
          <p className="mt-1 font-semibold text-red-300">
            Rebuild blocked because public catalogue safety validation failed.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => post("dry_run_p1", "Dry Run P1 (5)", { dryRun: true, confirm: false })}
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
          onClick={() => post("extract_snapshots", "Extract Existing Snapshots (5)")}
          className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-medium hover:bg-indigo-600 disabled:opacity-50"
        >
          Extract Existing Snapshots (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("retry_legacy", "Retry Legacy Failures (5)")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Retry Legacy Failures (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("resolve", "Resolve Evidence (5)")}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium hover:bg-violet-600 disabled:opacity-50"
        >
          Resolve Evidence (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("quality_audit", "Quality Audit (5)")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Quality Audit (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("rebuild", "Rebuild Intelligence")}
          className="rounded-lg bg-cyan-800 px-3 py-1.5 text-xs font-medium hover:bg-cyan-700 disabled:opacity-50"
        >
          Rebuild Intelligence
        </button>
      </div>

      {lastDelta && lastDelta.length > 0 ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
          <p className="text-xs font-semibold text-slate-400">Before / After Delta</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-slate-300">
            {lastDelta.join("\n")}
          </pre>
        </div>
      ) : null}

      {dryRunPreview && dryRunPreview.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-[11px]">
          <p className="font-semibold text-amber-200">
            Dry Run Preview ({dryRunPreview.length}) — no writes
          </p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-slate-300">
            {JSON.stringify(dryRunPreview, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
