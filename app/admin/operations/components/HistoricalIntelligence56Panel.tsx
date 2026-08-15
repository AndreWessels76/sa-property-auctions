"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type FunnelStep = { key: string; label: string; value: number; rate?: number | string };
type Candidate = {
  observationId: string;
  auctionEventId: string | null;
  propertyLabel: string;
  town: string | null;
  sourceStatus: string;
  sourceUrl: string | null;
  priority: number;
  currentState: string;
  recommendedAction: string;
  whyEligible: string;
  lane: string;
};

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  verdict?: string;
  reason?: string;
  campaign56?: {
    status: string;
    summaryLine: string;
    dataCoverageImproving?: boolean;
    dataCoverageReady?: boolean;
  };
  p1Progress56?: {
    originalP1: number;
    processed: number;
    remaining: number;
    blocked: number;
    successful: number;
    failed: number;
    progressPercent: number;
    progressBar: string;
    progressLabel: string;
  };
  evidenceFunnel56?: FunnelStep[];
  bottleneck56?: {
    code: string;
    count: number;
    total: number;
    percentage: number;
    recommendedAction: string;
  };
  nextCandidates56?: Candidate[];
  safety56?: {
    catalogueLeaks: number;
    catalogueSafe: boolean;
    rebuildStatus: string;
  };
  recoveryLanes55?: {
    neverAttempted: number;
    legacyUnknownFailures: number;
    snapshotExtractionPending: number;
  };
  nextAdminAction?: string;
};

function displayMetric(value: number | string | undefined | null): string {
  if (value == null) return "DATA UNAVAILABLE";
  return String(value);
}

export default function HistoricalIntelligence56Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dryRunPreview, setDryRunPreview] = useState<unknown[] | null>(null);
  const [lastDelta, setLastDelta] = useState<string[] | null>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-intelligence56", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HI 5.6 dashboard");
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
        const res = await fetch("/api/admin/intelligence/historical-intelligence56", {
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
        const candidates = json.result?.candidates56 ?? json.result?.candidates;
        if (opts?.dryRun && Array.isArray(candidates)) {
          setDryRunPreview(candidates);
        }
        const lines =
          (json.result?.evidenceDelta?.lines as string[] | undefined) ??
          (json.result?.explicitDelta?.lines as string[] | undefined);
        if (lines) setLastDelta(lines);
        toast.success(json.result?.message ?? `${label} complete`);
        if (!opts?.dryRun) load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${label} failed`);
      }
    });
  }

  const p1 = data?.p1Progress56;
  const funnel = data?.evidenceFunnel56 ?? [];
  const candidates = data?.nextCandidates56 ?? [];
  const bn = data?.bottleneck56;

  return (
    <section className="mt-10 rounded-2xl border border-orange-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Historical Intelligence 5.6 — Production Recovery & Evidence Coverage
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Move never-attempted events into real evidence. Max batch 5. No fabricated SOLD. Work
            the current bottleneck — not another dashboard.
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
        <p className="mt-3 text-sm font-semibold text-orange-200">
          Verdict: {data.verdict}
          {data.reason ? ` — ${data.reason}` : ""}
        </p>
      ) : null}

      {/* Bottleneck — large clear display */}
      {bn ? (
        <div className="mt-4 rounded-xl border border-amber-600/50 bg-amber-950/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Current Bottleneck
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-100">
            {bn.code.replace(/_/g, " ")} — {bn.count}/{bn.total}
          </p>
          <p className="mt-1 text-sm text-amber-200/90">
            {bn.percentage}% · {bn.recommendedAction}
          </p>
          {data.nextAdminAction ? (
            <p className="mt-2 text-xs text-slate-300">Next: {data.nextAdminAction}</p>
          ) : null}
        </div>
      ) : null}

      {/* Campaign */}
      <div className="mt-4 rounded-lg border border-orange-900/50 bg-orange-950/20 p-4">
        <p className="text-sm font-semibold text-orange-100">Campaign</p>
        <p className="mt-1 text-xs text-slate-300">
          Status: {displayMetric(data?.campaign56?.status)}
        </p>
        {p1 ? (
          <>
            <p className="mt-2 font-mono text-sm tracking-wider text-orange-200">
              P1 Progress [{p1.progressBar}] {p1.progressLabel} ({p1.progressPercent}%)
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Original: {p1.originalP1} · Processed: {p1.processed} · Remaining: {p1.remaining} ·
              Blocked: {p1.blocked} · Successful: {p1.successful} · Failed: {p1.failed}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-amber-200">DATA UNAVAILABLE</p>
        )}
        {data?.recoveryLanes55 ? (
          <p className="mt-1 text-[11px] text-slate-400">
            Never attempted: {data.recoveryLanes55.neverAttempted} · Legacy:{" "}
            {data.recoveryLanes55.legacyUnknownFailures} · Snapshot extract pending:{" "}
            {data.recoveryLanes55.snapshotExtractionPending}
          </p>
        ) : null}
      </div>

      {/* Funnel */}
      {funnel.length > 0 ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs font-semibold uppercase text-slate-400">Evidence Funnel</p>
          <div className="mt-2 space-y-1 font-mono text-xs text-slate-200">
            {funnel.map((step, i) => (
              <div key={step.key}>
                {i > 0 ? <div className="pl-6 text-slate-600">↓</div> : null}
                <div>
                  {step.value} {step.label}
                  {step.rate != null && step.rate !== "INSUFFICIENT_DATA"
                    ? ` (${step.rate}%)`
                    : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Candidate queue */}
      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Candidate Queue (next ≤5)
        </p>
        {candidates.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">No candidates for current bottleneck.</p>
        ) : (
          <div className="mt-2 max-h-56 overflow-auto">
            <table className="w-full text-left text-[11px] text-slate-200">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 pr-2">Property</th>
                  <th className="py-1 pr-2">Town</th>
                  <th className="py-1 pr-2">Lane</th>
                  <th className="py-1 pr-2">State</th>
                  <th className="py-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.observationId} className="border-t border-slate-800">
                    <td className="py-1 pr-2 font-medium">{c.propertyLabel}</td>
                    <td className="py-1 pr-2">{c.town ?? "—"}</td>
                    <td className="py-1 pr-2">{c.lane}</td>
                    <td className="py-1 pr-2 font-mono text-[10px]">{c.currentState}</td>
                    <td className="py-1">{c.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Safety */}
      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs">
        <p className="font-semibold text-slate-300">Production Safety</p>
        <p className="mt-1 text-slate-400">
          Catalogue leaks: {displayMetric(data?.safety56?.catalogueLeaks)} · Rebuild:{" "}
          {displayMetric(data?.safety56?.rebuildStatus)}
        </p>
        {data?.safety56 && data.safety56.catalogueLeaks > 0 ? (
          <p className="mt-1 font-semibold text-red-300">PUBLIC_CATALOGUE_SAFETY_BLOCKED</p>
        ) : null}
      </div>

      {/* Actions */}
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
          className="rounded-lg bg-orange-700 px-3 py-1.5 text-xs font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          Acquire P1 (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            post("dry_run_legacy", "Dry Run Legacy (5)", { dryRun: true, confirm: false })
          }
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Dry Run Legacy (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("retry_legacy", "Retry Legacy (5)")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Retry Legacy (5)
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
          onClick={() => post("resolve", "Resolve Evidence")}
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
            Dry Run Preview ({dryRunPreview.length}) — NO PRODUCTION WRITE
          </p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-slate-300">
            {JSON.stringify(dryRunPreview, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
