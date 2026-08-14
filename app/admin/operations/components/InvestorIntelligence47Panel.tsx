"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type CoverageDashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  verdict?: string;
  reason?: string;
  connectivity?: {
    status: string;
    message: string;
  };
  metrics?: {
    propertyMasters: number;
    auctionEvents: number;
    historicalEvents: number;
    eligibleP1: number;
    eligibleP2: number;
    eligibleP3: number;
    eligibleP4: number;
    enrichmentRuns: number;
    successfulFetches: number;
    noChange: number;
    outcomeObservations: number;
    verifiedSold: number;
    soldWithoutPrice: number;
    verifiedSalePrices: number;
    conflicts: number;
    reviewRequired: number;
    comparableReady: number;
    marketReadyTowns: number;
    publicCatalogueLeaks: number;
    acquisitionGaps: number;
  };
  coverageSummary?: {
    total: number;
    snapshotAvailable: number;
    extractionAvailable: number;
    verifiedSold: number;
    soldWithoutPrice: number;
    verifiedSalePrices: number;
    reviewRequired: number;
    conflicts: number;
    insufficientData: number;
  };
  provenInProduction?: string[];
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

export default function InvestorIntelligence47Panel() {
  const [data, setData] = useState<CoverageDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/investor/coverage", {
          cache: "no-store",
        });
        const json = (await res.json()) as CoverageDashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load II 4.7 coverage");
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
        const res = await fetch("/api/admin/intelligence/investor/coverage", {
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

  const m = data?.metrics;
  const c = data?.coverageSummary;

  return (
    <section className="mt-10 rounded-2xl border border-violet-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Investor Intelligence 4.7 — Production Coverage</h2>
          <p className="mt-1 text-sm text-slate-300">
            Live evidence closure over HEA 4.3 → HI 4.2 → HEQ 4.4 → II 4.6. Never fabricates
            statistics.
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
        <p className="mt-2 text-sm font-semibold text-violet-200">
          Verdict: {data.verdict}
          {data.reason ? ` — ${data.reason}` : ""}
        </p>
      ) : null}

      {m ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            <Stat label="Property Masters" value={m.propertyMasters} />
            <Stat label="Auction Events" value={m.auctionEvents} />
            <Stat label="Historical Events" value={m.historicalEvents} />
            <Stat label="P1 eligible" value={m.eligibleP1} />
            <Stat label="P2 eligible" value={m.eligibleP2} />
            <Stat label="P3 eligible" value={m.eligibleP3} />
            <Stat label="P4 eligible" value={m.eligibleP4} />
            <Stat label="Enrichment runs" value={m.enrichmentRuns} />
            <Stat label="Successful fetches" value={m.successfulFetches} />
            <Stat label="No change" value={m.noChange} />
            <Stat label="Outcome observations" value={m.outcomeObservations} />
            <Stat label="Verified SOLD" value={m.verifiedSold} />
            <Stat label="SOLD without price" value={m.soldWithoutPrice} />
            <Stat label="Verified sale prices" value={m.verifiedSalePrices} />
            <Stat label="Conflicts" value={m.conflicts} />
            <Stat label="Review required" value={m.reviewRequired} />
            <Stat label="Comparable ready" value={m.comparableReady} />
            <Stat label="Market-ready towns" value={m.marketReadyTowns} />
            <Stat label="Catalogue leaks" value={m.publicCatalogueLeaks} />
            <Stat label="Acquisition gaps" value={m.acquisitionGaps} />
          </div>

          {c ? (
            <p className="mt-3 text-xs text-slate-400">
              Coverage audit: {c.snapshotAvailable}/{c.total} snapshots ·{" "}
              {c.extractionAvailable}/{c.total} extractions · {c.insufficientData} insufficient
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => post("dry_run_p1", "Dry run P1 (5)")}
              className="rounded-lg bg-amber-700/80 px-3 py-1.5 text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              Dry run P1 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("acquire_p1", "Acquire P1 (5)")}
              className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium hover:bg-violet-600 disabled:opacity-50"
            >
              Acquire P1 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post("rebuild_intelligence", "Rebuild intelligence")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              Rebuild Intelligence
            </button>
          </div>

          {data.dataStillMissing && data.dataStillMissing.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-800/50 bg-amber-950/30 p-3 text-xs text-amber-100">
              <p className="font-semibold uppercase tracking-wide text-amber-300">Data still missing</p>
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
