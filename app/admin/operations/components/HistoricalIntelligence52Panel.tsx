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
  failureClassification: string;
  retryable: boolean;
  snapshot: boolean;
  extraction: string;
  outcome: string;
  salePrice: string;
  resolution: string | null;
  evidenceQuality: string | null;
  nextAction: string;
};

type StageSummary = {
  id: string;
  label: string;
  eligible: number;
  nextBatch: number;
  remaining: number;
  recommendedAction: string;
};

type BottleneckRank = {
  code: string;
  count: number;
  total: number;
  recommendedAction: string;
};

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  verdict?: string;
  reason?: string;
  coverage52?: Record<string, number | string>;
  stages?: StageSummary[];
  bottleneck?: BottleneckRank;
  bottleneckRanked?: BottleneckRank[];
  nextAdminAction?: string;
  evidenceLabels?: {
    provenInProduction: string[];
    tested: string[];
    engineReady: string[];
    insufficientData: string[];
    reviewRequired: string[];
  };
  stateMachineCounts?: Record<string, number>;
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

export default function HistoricalIntelligence52Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dryRunPreview, setDryRunPreview] = useState<unknown[] | null>(null);
  const [lastDelta, setLastDelta] = useState<{
    lines: string[];
    before?: Record<string, number>;
    after?: Record<string, number>;
  } | null>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-intelligence52", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HI 5.2 dashboard");
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
        const res = await fetch("/api/admin/intelligence/historical-intelligence52", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, limit: 5 }),
        });
        const json = await res.json();
        if (!json.ok) {
          toast.error(json.error ?? json.result?.message ?? `${label} failed`);
          return;
        }
        if (dryRunOnly && json.result?.candidates) {
          setDryRunPreview(json.result.candidates);
        }
        const delta = json.result?.batchDelta ?? json.result?.beforeAfter?.delta;
        if (delta) {
          setLastDelta({
            lines: delta.lines ?? [],
            before: delta.before,
            after: delta.after,
          });
        }
        toast.success(
          delta?.lines?.length
            ? `${json.result?.message ?? label} — ${delta.lines.join(", ")}`
            : json.result?.message ?? `${label} complete`,
        );
        if (!dryRunOnly) load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${label} failed`);
      }
    });
  }

  const cov = data?.coverage52;
  const p4Events = useMemo(
    () => (data?.events ?? []).filter((e) => e.recoveryPriority === 4),
    [data?.events],
  );

  return (
    <section className="mt-10 rounded-2xl border border-sky-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Historical Intelligence 5.2 — Controlled Recovery & Execution
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Execute phased P1 / legacy / snapshot extraction batches over HI 5.1 — aggressively
            recover evidence, conservatively declare facts.
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
        <p className="mt-3 text-sm font-semibold text-sky-200">
          Verdict: {data.verdict}
          {data.reason ? ` — ${data.reason}` : ""}
        </p>
      ) : null}

      {data?.bottleneck ? (
        <div className="mt-3 rounded-lg border border-sky-900/50 bg-sky-950/30 p-3 text-xs">
          <p className="font-semibold text-sky-200">
            Primary bottleneck: {data.bottleneck.code.replace(/_/g, " ")} —{" "}
            {data.bottleneck.count}/{data.bottleneck.total}
          </p>
          <p className="mt-1 text-slate-300">{data.bottleneck.recommendedAction}</p>
          {data.nextAdminAction ? (
            <p className="mt-1 text-sky-100/80">Next: {data.nextAdminAction}</p>
          ) : null}
        </div>
      ) : null}

      {data?.bottleneckRanked && data.bottleneckRanked.length > 1 ? (
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          {data.bottleneckRanked.map((b) => (
            <span key={b.code} className="rounded bg-slate-900/70 px-2 py-0.5 text-slate-300">
              {b.code}: {b.count}/{b.total}
            </span>
          ))}
        </div>
      ) : null}

      {data?.stages ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {data.stages.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <p className="font-semibold text-slate-200">
                {s.id}: {s.label}
              </p>
              <p className="mt-1 text-slate-400">
                Eligible {s.eligible} · Next {s.nextBatch} · Remaining {s.remaining}
              </p>
              <p className="mt-1 text-sky-200/80">{s.recommendedAction}</p>
            </div>
          ))}
        </div>
      ) : null}

      {cov ? (
        <>
          <p className="mt-4 text-xs font-semibold uppercase text-slate-400">Coverage</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            <Stat label="Historical Events" value={cov.historicalEvents ?? 0} />
            <Stat label="Licensed Sources" value={cov.licensedSources ?? "—"} />
            <Stat label="Fetch Attempted" value={cov.fetchAttempted ?? "—"} />
            <Stat label="Never Attempted" value={cov.neverAttempted ?? 0} />
            <Stat label="Fetch Successful" value={cov.fetchSuccessful ?? 0} />
            <Stat label="Fetch Failed" value={cov.fetchFailed ?? 0} />
            <Stat label="Retryable" value={cov.retryable ?? 0} />
            <Stat label="Permanent" value={cov.permanent ?? 0} />
            <Stat label="Legacy Failures" value={cov.legacyFailures ?? 0} />
            <Stat label="Snapshots" value={cov.snapshots ?? "—"} />
            <Stat label="Missing Extraction" value={cov.missingExtraction ?? 0} />
            <Stat label="Extractions" value={cov.extractions ?? "—"} />
            <Stat label="Outcome Evidence" value={cov.outcomeEvidence ?? "—"} />
            <Stat label="Verified SOLD" value={cov.verifiedSold ?? 0} />
            <Stat label="SOLD Without Price" value={cov.soldWithoutPrice ?? 0} />
            <Stat label="Verified Sale Prices" value={cov.verifiedSalePrices ?? 0} />
            <Stat label="Comparable Ready" value={cov.comparableReady ?? 0} />
            <Stat label="Market Ready Towns" value={cov.marketReadyTowns ?? 0} />
            <Stat label="Catalogue Leaks" value={cov.catalogueLeaks ?? 0} />
          </div>

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
              className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-medium hover:bg-sky-600 disabled:opacity-50"
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
              onClick={() => post("retry_legacy_failures", "Retry Legacy Failures (5)")}
              className="rounded-lg bg-orange-700 px-3 py-1.5 text-xs font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              Retry Legacy Failures (5)
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
              disabled={pending}
              onClick={() => post("rebuild_intelligence", "Rebuild Intelligence")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              Rebuild Intelligence
            </button>
          </div>

          {lastDelta ? (
            <div className="mt-4 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs">
              <p className="font-semibold text-emerald-200">Last batch before / after</p>
              <p className="mt-1 text-slate-300">{lastDelta.lines.join(" · ") || "No metric change"}</p>
              {lastDelta.before && lastDelta.after ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-slate-400">Before</p>
                    <p>Never attempted path: fetchAttempted {lastDelta.before.fetchAttempted}</p>
                    <p>Snapshots {lastDelta.before.snapshots} · Extractions {lastDelta.before.extractions}</p>
                    <p>
                      Outcomes {lastDelta.before.outcomeEvidence} · SOLD {lastDelta.before.verifiedSold} ·
                      Prices {lastDelta.before.verifiedSalePrices}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">After</p>
                    <p>fetchAttempted {lastDelta.after.fetchAttempted}</p>
                    <p>Snapshots {lastDelta.after.snapshots} · Extractions {lastDelta.after.extractions}</p>
                    <p>
                      Outcomes {lastDelta.after.outcomeEvidence} · SOLD {lastDelta.after.verifiedSold} ·
                      Prices {lastDelta.after.verifiedSalePrices}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

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
                    <th className="p-1">Stage</th>
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
                        <td className="p-1">{String(r.stage ?? "—")}</td>
                        <td className="p-1">{String(r.executionState ?? r.currentState ?? "—")}</td>
                        <td className="p-1">{String(r.expectedAction ?? "—")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {data.evidenceLabels ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-[11px]">
              {(
                [
                  ["provenInProduction", "PROVEN"],
                  ["tested", "TESTED"],
                  ["engineReady", "ENGINE READY"],
                  ["insufficientData", "INSUFFICIENT DATA"],
                  ["reviewRequired", "REVIEW REQUIRED"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="rounded bg-slate-900/50 p-2">
                  <p className="font-semibold uppercase text-slate-400">{label}</p>
                  <ul className="mt-1 list-inside list-disc text-slate-300">
                    {(data.evidenceLabels![key] ?? []).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          {p4Events.length > 0 ? (
            <div className="mt-4 rounded-lg border border-red-900/40 bg-red-950/20 p-3">
              <p className="text-xs font-semibold text-red-200">
                P4 Review ({p4Events.length}) — never hidden
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
                {p4Events.slice(0, 9).map((e) => (
                  <li key={e.observationId}>
                    {e.propertyLabel} — {e.evidenceState} — {e.nextAction}
                    {e.httpStatus != null ? ` (HTTP ${e.httpStatus})` : ""}
                    {e.failureClassification === "LEGACY_UNKNOWN_FAILURE" ? " [LEGACY]" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-600 text-slate-400">
                  <th className="p-2">Property</th>
                  <th className="p-2">Town</th>
                  <th className="p-2">Priority</th>
                  <th className="p-2">State</th>
                  <th className="p-2">HTTP</th>
                  <th className="p-2">Snapshot</th>
                  <th className="p-2">Extraction</th>
                  <th className="p-2">Outcome</th>
                  <th className="p-2">Sale Price</th>
                  <th className="p-2">Next</th>
                </tr>
              </thead>
              <tbody>
                {(data.events ?? []).slice(0, 40).map((e) => (
                  <tr key={e.observationId} className="border-b border-slate-700/50">
                    <td className="p-2">{e.propertyLabel}</td>
                    <td className="p-2">{e.town ?? "—"}</td>
                    <td className="p-2">P{e.recoveryPriority}</td>
                    <td className="p-2">{e.evidenceState}</td>
                    <td className="p-2">
                      {e.httpStatus ??
                        (e.failureClassification === "LEGACY_UNKNOWN_FAILURE" ? "LEGACY" : "—")}
                    </td>
                    <td className="p-2">{e.snapshot ? "YES" : "NO"}</td>
                    <td className="p-2">{e.extraction}</td>
                    <td className="p-2">{e.outcome}</td>
                    <td className="p-2">{e.salePrice}</td>
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
