"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type FunnelStep = { key: string; label: string; value: number };
type BatchSlot = { batchNumber: number; size: number; status: string; remainingAfter: number };
type ReviewItem = {
  observationId: string;
  propertyLabel: string;
  category: string;
  reason: string;
  nextAction: string;
};

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  verdict?: string;
  reason?: string;
  campaign?: {
    status: string;
    remaining: number;
    fetchAttempted: number;
    totalEvents: number;
    fetchSuccessful: number;
    fetchFailed: number;
    progressBar: string;
    summaryLine: string;
  };
  p1Campaign?: {
    remaining: number;
    successful: number;
    failed: number;
    retryable: number;
    permanent: number;
    plannedBatches: number;
  };
  batchPlan?: BatchSlot[];
  evidenceFunnel?: FunnelStep[];
  bottleneck53?: {
    code: string;
    count: number;
    total: number;
    recommendedAction: string;
  };
  bottleneckRanked53?: Array<{ code: string; count: number; total: number }>;
  reviewQueue?: ReviewItem[];
  catalogueSafe?: boolean;
  nextAdminAction?: string;
  reportLabels?: {
    provenInProduction: string[];
    tested: string[];
    recovered: string[];
    stillMissing: string[];
    reviewRequired: string[];
    insufficientData: string[];
  };
  coverage52?: Record<string, number | string>;
};

export default function HistoricalIntelligence53Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dryRunPreview, setDryRunPreview] = useState<unknown[] | null>(null);
  const [lastDelta, setLastDelta] = useState<string[] | null>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-intelligence53", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HI 5.3 dashboard");
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
        const res = await fetch("/api/admin/intelligence/historical-intelligence53", {
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
        if (dryRunOnly && json.result?.candidates) {
          setDryRunPreview(json.result.candidates);
        }
        const lines = json.result?.explicitDelta?.lines as string[] | undefined;
        if (lines) setLastDelta(lines);
        toast.success(json.result?.message ?? `${label} complete`);
        if (!dryRunOnly) load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${label} failed`);
      }
    });
  }

  const campaign = data?.campaign;
  const funnel = data?.evidenceFunnel ?? [];

  return (
    <section className="mt-10 rounded-2xl border border-teal-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Historical Intelligence 5.3 — Evidence Recovery Campaign
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Recover existing licensed evidence in controlled batches of 5 — never invent SOLD or
            sale prices.
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
        <p className="mt-3 text-sm font-semibold text-teal-200">
          Verdict: {data.verdict}
          {data.reason ? ` — ${data.reason}` : ""}
        </p>
      ) : null}

      {campaign ? (
        <div className="mt-4 rounded-lg border border-teal-900/50 bg-teal-950/30 p-4">
          <p className="text-sm font-semibold text-teal-100">Historical Evidence Recovery</p>
          <p className="mt-1 text-xs text-slate-300">{campaign.status}</p>
          <p className="mt-2 font-mono text-sm tracking-wider text-teal-200">
            {campaign.progressBar}
          </p>
          <p className="mt-2 text-xs text-slate-300">
            {campaign.remaining} remaining · {campaign.summaryLine}
          </p>
          {data.p1Campaign ? (
            <p className="mt-1 text-[11px] text-slate-400">
              P1 planned batches: {data.p1Campaign.plannedBatches} · successful{" "}
              {data.p1Campaign.successful} · failed {data.p1Campaign.failed} · retryable{" "}
              {data.p1Campaign.retryable} · permanent {data.p1Campaign.permanent}
            </p>
          ) : null}
        </div>
      ) : null}

      {data?.bottleneck53 ? (
        <div className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-xs">
          <p className="font-semibold text-amber-200">
            CURRENT BOTTLENECK — {data.bottleneck53.code.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-slate-300">
            {data.bottleneck53.count} / {data.bottleneck53.total} events
          </p>
          <p className="mt-1 text-teal-200">Recommended: {data.bottleneck53.recommendedAction}</p>
          {data.nextAdminAction ? (
            <p className="mt-1 text-slate-400">Next: {data.nextAdminAction}</p>
          ) : null}
        </div>
      ) : null}

      {data?.batchPlan && data.batchPlan.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          {data.batchPlan.map((b) => (
            <span
              key={b.batchNumber}
              className={`rounded px-2 py-0.5 ${
                b.status === "next"
                  ? "bg-amber-900/60 text-amber-100"
                  : "bg-slate-900/70 text-slate-300"
              }`}
            >
              Batch {b.batchNumber}: {b.size} events → {b.remainingAfter} remaining
            </span>
          ))}
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

      {!data?.catalogueSafe ? (
        <p className="mt-3 text-sm font-semibold text-red-300">
          PUBLIC SAFETY FAILURE — rebuild blocked
        </p>
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
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium hover:bg-teal-600 disabled:opacity-50"
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
          disabled={pending}
          onClick={() => post("retry_legacy_failures", "Retry Legacy (5)")}
          className="rounded-lg bg-orange-700 px-3 py-1.5 text-xs font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          Retry Legacy (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("dry_run_extraction", "Dry Run Extraction (5)", true)}
          className="rounded-lg bg-amber-900/80 px-3 py-1.5 text-xs font-medium hover:bg-amber-800 disabled:opacity-50"
        >
          Dry Run Extraction (5)
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
          onClick={() => post("resolve_evidence", "Resolve Evidence")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
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
          disabled={pending || data?.catalogueSafe === false}
          onClick={() => post("rebuild_intelligence", "Rebuild Intelligence")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Rebuild Intelligence
        </button>
      </div>

      {lastDelta ? (
        <div className="mt-4 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs">
          <p className="font-semibold text-emerald-200">Last batch before / after (zeros shown)</p>
          <pre className="mt-2 whitespace-pre-wrap text-slate-300">{lastDelta.join("\n")}</pre>
        </div>
      ) : null}

      {dryRunPreview && dryRunPreview.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
          <p className="text-xs font-semibold text-amber-200">Dry Run Preview (no writes)</p>
          <table className="mt-2 w-full min-w-[800px] text-left text-[11px]">
            <thead>
              <tr className="text-slate-400">
                <th className="p-1">Event</th>
                <th className="p-1">Property</th>
                <th className="p-1">Town</th>
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
                    <td className="p-1">{String(r.town ?? "—")}</td>
                    <td className="p-1">{String(r.executionState ?? r.currentState ?? "—")}</td>
                    <td className="p-1">{String(r.expectedAction ?? "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {data?.reviewQueue && data.reviewQueue.length > 0 ? (
        <div className="mt-4 rounded-lg border border-red-900/40 bg-red-950/20 p-3">
          <p className="text-xs font-semibold text-red-200">
            Review Queue ({data.reviewQueue.length}) — never discarded
          </p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[11px] text-slate-300">
            {data.reviewQueue.slice(0, 30).map((item) => (
              <li key={`${item.observationId}-${item.category}`}>
                [{item.category}] {item.propertyLabel} — {item.reason} → {item.nextAction}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data?.reportLabels ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-[11px]">
          {(
            [
              ["provenInProduction", "PROVEN"],
              ["tested", "TESTED"],
              ["recovered", "RECOVERED"],
              ["stillMissing", "STILL MISSING"],
              ["reviewRequired", "REVIEW REQUIRED"],
              ["insufficientData", "INSUFFICIENT DATA"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="rounded bg-slate-900/50 p-2">
              <p className="font-semibold uppercase text-slate-400">{label}</p>
              <ul className="mt-1 list-inside list-disc text-slate-300">
                {(data.reportLabels![key] ?? []).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
