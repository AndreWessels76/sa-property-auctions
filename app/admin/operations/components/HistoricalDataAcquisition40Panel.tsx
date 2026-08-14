"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type QueueItem = {
  priority: number;
  propertyId: string;
  auctionEventId: string | null;
  town: string | null;
  agency: string | null;
  outcome: string | null;
  salePrice: number | null;
  reason: string;
  sourceResolution: { status: string; sourceUrl: string | null };
};

type ConflictRow = {
  id: string;
  claim_a: string;
  claim_b: string;
  status: string;
  property_master_id: string | null;
  evidence_a: string | null;
  evidence_b: string | null;
};

type Dashboard = {
  ok: boolean;
  error?: string;
  version?: string;
  historicalEvents?: number;
  outcomeVerified?: number;
  outcomeUnknown?: number;
  salePriceVerified?: number;
  outcomeCoveragePct?: number | null;
  queueSummary?: {
    total: number;
    priority1: number;
    priority2: number;
    priority3: number;
    priority4: number;
    retryFailed?: number;
    eligible: number;
    reviewRequired: number;
  };
  funnel?: {
    historicalEvents: number;
    sourceEligible: number;
    fetchAttempted: number;
    sourceFound: number;
    unchanged: number;
    changed: number;
    outcomeExtracted: number;
    soldConfirmed: number;
    salePriceFound: number;
    salePriceVerified: number;
    comparableReady: number;
    conflicts: number;
    failed: number;
    skippedLicense: number;
    sourceUnavailable: number;
  };
  milestones?: {
    firstVerifiedSold: boolean;
    firstVerifiedSalePrice: boolean;
    threeComparableReady: boolean;
    fiveVerifiedSales: boolean;
    tenVerifiedSales: boolean;
    twentyFiveVerifiedSales: boolean;
  };
  outcomeBreakdown?: {
    sold: number;
    passedIn: number;
    withdrawn: number;
    cancelled: number;
    postponed: number;
    unknown: number;
  };
  enrichment?: {
    runs: number;
    outcomesExtracted: number;
    salePricesExtracted: number;
    noChange: number;
    reviewQueue: number;
  };
  queue?: QueueItem[];
  reviewQueue?: Array<{
    id: string;
    category: string;
    property_id: string | null;
    evidence_text: string | null;
    extracted_value: string | null;
    confidence: string | null;
  }>;
  recentRuns?: Array<{
    id: string;
    property_id: string | null;
    status: string;
    outcome: string | null;
    sale_price: number | null;
    source_url: string | null;
    created_at: string;
  }>;
  conflictsOpen?: number;
  conflicts?: ConflictRow[];
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-900/50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function HistoricalDataAcquisition40Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [propertyId, setPropertyId] = useState("");
  const [batchLimit, setBatchLimit] = useState(10);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-enrichment", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HDA 4.0 dashboard");
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

  async function postAction(body: Record<string, unknown>, label: string) {
    if (pending) return;
    startTransition(async () => {
      toast.message(`${label}…`);
      try {
        const res = await fetch("/api/admin/intelligence/historical-enrichment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.ok) {
          const msg = json.error ?? json.result?.message ?? `${label} failed`;
          toast.error(msg);
          setError(msg);
          return;
        }
        toast.success(json.result?.message ?? `${label} complete`);
        load();
      } catch (e) {
        const msg = e instanceof Error ? e.message : `${label} failed`;
        toast.error(msg);
        setError(msg);
      }
    });
  }

  async function resolveConflict(conflictId: string, action: "confirm_a" | "confirm_b" | "reject") {
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/outcomes/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conflictId, action }),
        });
        const json = await res.json();
        if (!json.ok) toast.error(json.error ?? "Conflict resolution failed");
        else {
          toast.success("Conflict updated");
          load();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Conflict resolution failed");
      }
    });
  }

  const ob = data?.outcomeBreakdown;
  const qs = data?.queueSummary;
  const funnel = data?.funnel;
  const milestones = data?.milestones;

  return (
    <section className="mt-10 rounded-2xl border border-emerald-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Historical Data Enrichment 4.1</h2>
          <p className="mt-1 text-sm text-slate-300">
            Verified historical outcome &amp; sale price acquisition — extends HDA 4.0 queue,
            refetch, and extraction. Never fabricates evidence.
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

      {error ? <p className="mt-4 text-sm text-amber-300">{error}</p> : null}

      {data ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            <Stat label="Historical events" value={data.historicalEvents ?? 0} />
            <Stat label="Outcome verified" value={data.outcomeVerified ?? 0} />
            <Stat label="Outcome unknown" value={data.outcomeUnknown ?? 0} />
            <Stat label="Sale price verified" value={data.salePriceVerified ?? 0} />
            <Stat
              label="Outcome coverage"
              value={
                data.outcomeCoveragePct != null ? `${data.outcomeCoveragePct}%` : "—"
              }
            />
            <Stat label="Queue eligible" value={qs?.eligible ?? 0} />
          </div>

          {funnel ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-300">Acquisition funnel</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-4 lg:grid-cols-6 text-xs">
                <Stat label="Historical events" value={funnel.historicalEvents} />
                <Stat label="Source eligible" value={funnel.sourceEligible} />
                <Stat label="Fetch attempted" value={funnel.fetchAttempted} />
                <Stat label="Source found" value={funnel.sourceFound} />
                <Stat label="Outcome extracted" value={funnel.outcomeExtracted} />
                <Stat label="SOLD confirmed" value={funnel.soldConfirmed} />
                <Stat label="Sale price found" value={funnel.salePriceFound} />
                <Stat label="Sale price verified" value={funnel.salePriceVerified} />
                <Stat label="Comparable ready" value={funnel.comparableReady} />
                <Stat label="License blocked" value={funnel.skippedLicense} />
                <Stat label="Source unavailable" value={funnel.sourceUnavailable} />
                <Stat label="Failed" value={funnel.failed} />
              </div>
            </div>
          ) : null}

          {milestones ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-300">Milestones</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {[
                  ["First verified SOLD", milestones.firstVerifiedSold],
                  ["First verified sale price", milestones.firstVerifiedSalePrice],
                  ["3 comparable-ready", milestones.threeComparableReady],
                  ["5 verified sales", milestones.fiveVerifiedSales],
                  ["10 verified sales", milestones.tenVerifiedSales],
                  ["25 verified sales", milestones.twentyFiveVerifiedSales],
                ].map(([label, done]) => (
                  <span
                    key={String(label)}
                    className={`rounded-full px-2 py-0.5 ${
                      done ? "bg-emerald-900/60 text-emerald-200" : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {label as string}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {ob ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-300">Outcomes</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-6 text-xs">
                <Stat label="SOLD" value={ob.sold} />
                <Stat label="PASSED IN" value={ob.passedIn} />
                <Stat label="WITHDRAWN" value={ob.withdrawn} />
                <Stat label="CANCELLED" value={ob.cancelled} />
                <Stat label="POSTPONED" value={ob.postponed} />
                <Stat label="UNKNOWN" value={ob.unknown} />
              </div>
            </div>
          ) : null}

          {qs ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-300">Enrichment queue</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-4 text-xs">
                <Stat label="P1 — no outcome" value={qs.priority1} />
                <Stat label="P2 — missing price" value={qs.priority2} />
                <Stat label="P3 — missing size" value={qs.priority3} />
                <Stat label="P4 — low value / review" value={qs.priority4} />
                <Stat label="Retry failed" value={qs.retryFailed ?? 0} />
              </div>
            </div>
          ) : null}

          {data.enrichment ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-300">Source health</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-4 text-xs">
                <Stat label="Enrichment runs" value={data.enrichment.runs} />
                <Stat label="NO_CHANGE" value={data.enrichment.noChange} />
                <Stat label="Outcomes extracted" value={data.enrichment.outcomesExtracted} />
                <Stat label="Sale prices extracted" value={data.enrichment.salePricesExtracted} />
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-400">
          Batch limit
          <input
            type="number"
            min={1}
            max={30}
            value={batchLimit}
            onChange={(e) => setBatchLimit(Number(e.target.value) || 10)}
            className="ml-2 w-14 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-white"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void postAction({ action: "dry_run", limit: 5 }, "Dry run (5 events)")
          }
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Dry run (5)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void postAction({ action: "enrich_p1", limit: batchLimit }, "Enrich P1")
          }
          className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          Enrich P1
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void postAction({ action: "enrich_p2", limit: batchLimit }, "Enrich P2")
          }
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
        >
          Enrich P2
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void postAction(
              { action: "batch", scope: "historical", limit: batchLimit },
              "Enrich batch",
            )
          }
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
        >
          Enrich batch
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void postAction(
              { action: "retry_failed", limit: batchLimit },
              "Retry failed",
            )
          }
          className="rounded-lg bg-amber-900/70 px-3 py-1.5 text-xs font-medium hover:bg-amber-800 disabled:opacity-50"
        >
          Retry failed
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void postAction(
              { action: "batch", scope: "historical", limit: batchLimit, force: true },
              "Refresh historical sources",
            )
          }
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Refresh historical sources
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void postAction(
              { action: "extract_prices", scope: "historical", limit: batchLimit },
              "Extract historical prices",
            )
          }
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Extract from snapshots
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void postAction({ action: "rebuild_intelligence" }, "Rebuild historical intelligence")
          }
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Rebuild intelligence
        </button>
        <input
          type="text"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          placeholder="Property ID"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs text-white"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!propertyId.trim()) {
              setError("Property ID required");
              return;
            }
            void postAction({ propertyId: propertyId.trim(), action: "refresh" }, "Refresh source");
          }}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Single refresh
        </button>
      </div>

      {data?.queue && data.queue.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Queue (top 20)</h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400">
                <th className="py-2 pr-3">P</th>
                <th className="py-2 pr-3">Property</th>
                <th className="py-2 pr-3">Outcome</th>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.queue.map((row) => (
                <tr key={row.propertyId} className="border-b border-slate-700/50">
                  <td className="py-2 pr-3">{row.priority}</td>
                  <td className="py-2 pr-3 font-mono">{row.propertyId.slice(0, 8)}…</td>
                  <td className="py-2 pr-3">{row.outcome ?? "—"}</td>
                  <td className="py-2 pr-3">{row.sourceResolution.status}</td>
                  <td className="py-2 text-slate-400">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data?.conflicts && data.conflicts.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">
            Historical evidence conflicts ({data.conflictsOpen ?? 0})
          </h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400">
                <th className="py-2 pr-3">Claim A</th>
                <th className="py-2 pr-3">Claim B</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.conflicts.slice(0, 8).map((c) => (
                <tr key={c.id} className="border-b border-slate-700/50">
                  <td className="py-2 pr-3">{c.claim_a ?? "—"}</td>
                  <td className="py-2 pr-3">{c.claim_b ?? "—"}</td>
                  <td className="py-2 pr-3 space-x-1">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void resolveConflict(c.id, "confirm_a")}
                      className="rounded bg-slate-700 px-2 py-0.5 hover:bg-slate-600 disabled:opacity-50"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void resolveConflict(c.id, "confirm_b")}
                      className="rounded bg-slate-700 px-2 py-0.5 hover:bg-slate-600 disabled:opacity-50"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void resolveConflict(c.id, "reject")}
                      className="rounded bg-red-900/60 px-2 py-0.5 hover:bg-red-800 disabled:opacity-50"
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

      {data?.recentRuns && data.recentRuns.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Recent enrichment runs</h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400">
                <th className="py-2 pr-3">Property</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Outcome</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {data.recentRuns.slice(0, 10).map((r) => (
                <tr key={r.id} className="border-b border-slate-700/50">
                  <td className="py-2 pr-3 font-mono">
                    {r.property_id?.slice(0, 8) ?? "—"}…
                  </td>
                  <td className="py-2 pr-3">{r.status}</td>
                  <td className="py-2 pr-3">{r.outcome ?? "—"}</td>
                  <td className="py-2 text-slate-400">{r.created_at?.slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
