"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type FunnelStep = { key: string; label: string; value: number };
type QualityCounts = {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  INSUFFICIENT_DATA: number;
  CONFLICT: number;
  REVIEW_REQUIRED: number;
};

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  verdict?: string;
  reason?: string;
  campaign54?: { status: string; summaryLine: string };
  p1Progress54?: {
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
  evidenceFunnel54?: FunnelStep[];
  bottleneck54?: {
    code: string;
    count: number;
    total: number;
    percentage: number;
    recommendedAction: string;
  };
  evidenceQualityCounts?: QualityCounts;
  safety?: {
    catalogueLeaks: number;
    catalogueSafe: boolean;
    rebuildStatus: string;
    lastSuccessfulAcquisition: string | null;
    lastSuccessfulRebuild: string | null;
  };
  coverage52?: Record<string, number | string>;
  nextAdminAction?: string;
};

function displayMetric(value: number | string | undefined | null): string {
  if (value == null) return "DATA UNAVAILABLE";
  return String(value);
}

export default function HistoricalIntelligence54Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dryRunPreview, setDryRunPreview] = useState<unknown[] | null>(null);
  const [lastDelta, setLastDelta] = useState<string[] | null>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-intelligence54", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HI 5.4 dashboard");
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

  async function post(action: string, label: string, opts?: { dryRun?: boolean; confirm?: boolean }) {
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
        const res = await fetch("/api/admin/intelligence/historical-intelligence54", {
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

  const p1 = data?.p1Progress54;
  const funnel = data?.evidenceFunnel54 ?? [];
  const q = data?.evidenceQualityCounts;
  const cov = data?.coverage52;

  return (
    <section className="mt-10 rounded-2xl border border-cyan-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Historical Intelligence 5.4 — Production Campaign Execution
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Controlled production recovery — SOURCE → FETCH → SNAPSHOT → EXTRACTION → OUTCOME →
            SALE PRICE. Batch limit 5. No fabricated SOLD.
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
        <p className="mt-3 text-sm font-semibold text-cyan-200">
          Verdict: {data.verdict}
          {data.reason ? ` — ${data.reason}` : ""}
        </p>
      ) : null}

      {/* Campaign */}
      <div className="mt-4 rounded-lg border border-cyan-900/50 bg-cyan-950/30 p-4">
        <p className="text-sm font-semibold text-cyan-100">Campaign</p>
        <p className="mt-1 text-xs text-slate-300">
          Status: {displayMetric(data?.campaign54?.status)}
        </p>
        <p className="mt-1 text-xs text-slate-300">
          Historical events: {displayMetric(cov?.historicalEvents)} · Licensed sources:{" "}
          {displayMetric(cov?.licensedSources)}
        </p>
        {p1 ? (
          <>
            <p className="mt-2 font-mono text-sm tracking-wider text-cyan-200">
              P1 Progress [{p1.progressBar}] {p1.progressLabel}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Original P1: {p1.originalP1} · Processed: {p1.processed} · Remaining: {p1.remaining} ·
              Blocked: {p1.blocked} · Successful: {p1.successful} · Failed: {p1.failed} · Retryable:{" "}
              {p1.retryable} · Review: {p1.reviewRequired}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-amber-200">DATA UNAVAILABLE</p>
        )}
        {data?.campaign54?.summaryLine ? (
          <p className="mt-1 text-[11px] text-slate-400">{data.campaign54.summaryLine}</p>
        ) : null}
      </div>

      {/* Bottleneck */}
      {data?.bottleneck54 ? (
        <div className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-xs">
          <p className="font-semibold text-amber-200">PRIMARY BOTTLENECK</p>
          <p className="mt-1 text-slate-200">{data.bottleneck54.code.replace(/_/g, " ")}</p>
          <p className="mt-1 text-slate-300">
            {data.bottleneck54.count} / {data.bottleneck54.total} ({data.bottleneck54.percentage}%)
          </p>
          <p className="mt-1 text-cyan-200">Recommended: {data.bottleneck54.recommendedAction}</p>
          {data.nextAdminAction ? (
            <p className="mt-1 text-slate-400">Next: {data.nextAdminAction}</p>
          ) : null}
        </div>
      ) : null}

      {/* Evidence Funnel */}
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

      {/* Evidence Quality */}
      {q ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3 md:grid-cols-6">
          {(
            [
              ["HIGH", q.HIGH],
              ["MEDIUM", q.MEDIUM],
              ["LOW", q.LOW],
              ["INSUFFICIENT_DATA", q.INSUFFICIENT_DATA],
              ["CONFLICT", q.CONFLICT],
              ["REVIEW_REQUIRED", q.REVIEW_REQUIRED],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded border border-slate-700 bg-slate-900/50 px-2 py-1.5">
              <p className="text-slate-500">{label}</p>
              <p className="font-mono text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Production Safety */}
      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs">
        <p className="font-semibold text-slate-300">Production Safety</p>
        <p className="mt-1 text-slate-400">
          Catalogue leaks: {displayMetric(data?.safety?.catalogueLeaks)} · Rebuild:{" "}
          {displayMetric(data?.safety?.rebuildStatus)} · Last acquisition:{" "}
          {data?.safety?.lastSuccessfulAcquisition ?? "DATA UNAVAILABLE"} · Last rebuild:{" "}
          {data?.safety?.lastSuccessfulRebuild ?? "DATA UNAVAILABLE"}
        </p>
        {data?.safety && data.safety.catalogueLeaks > 0 ? (
          <p className="mt-1 font-semibold text-red-300">PUBLIC SAFETY FAILURE — rebuild blocked</p>
        ) : null}
      </div>

      {/* Quick Actions */}
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
          className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-medium hover:bg-cyan-600 disabled:opacity-50"
        >
          Acquire P1 (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("retry_failed", "Retry Failed (5)")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Retry Failed (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("retry_network_failures", "Retry Network Failures (5)")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Retry Network Failures (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("extract_existing_snapshots", "Extract Existing Snapshots (5)")}
          className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-medium hover:bg-indigo-600 disabled:opacity-50"
        >
          Extract Existing Snapshots (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("resolve_evidence", "Resolve Evidence")}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium hover:bg-violet-600 disabled:opacity-50"
        >
          Resolve Evidence
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("quality_audit", "Quality Audit")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Quality Audit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("rebuild", "Rebuild Intelligence")}
          className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
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
          <p className="font-semibold text-amber-200">Dry Run Preview ({dryRunPreview.length})</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-slate-300">
            {JSON.stringify(dryRunPreview, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
