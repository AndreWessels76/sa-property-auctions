"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  resolverVersion?: string;
  dashboard?: {
    totalHistoricalEvents: number;
    unresolved: number;
    sourceFound: number;
    extracted: number;
    identityPending: number;
    reviewRequired: number;
    verified: number;
    verifiedSold: number;
    soldWithoutPrice: number;
    verifiedSalePrices: number;
    conflicts: number;
    identityReviews: number;
    insufficientData: number;
    comparableReady: number;
    marketStatisticsAvailable: boolean;
    evidenceConfidence: { high: number; medium: number; low: number; insufficient: number };
  };
  events?: Array<{
    observationId: string;
    auctionEventId: string | null;
    listingPropertyId: string | null;
    town: string | null;
    outcome: string;
    state: string;
    label: string | null;
    salePrice: number | null;
    evidenceQuality: string;
    comparableEligible: boolean;
    recommendedAction: string | null;
  }>;
  publicSafety?: { catalogueLeaks: number; ok: boolean };
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-900/50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function HistoricalResolution42Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-resolution", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HI 4.2 resolution dashboard");
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

  async function post(body: Record<string, unknown>, label: string) {
    if (pending) return;
    startTransition(async () => {
      toast.message(`${label}…`);
      try {
        const res = await fetch("/api/admin/intelligence/historical-resolution", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.ok) {
          toast.error(json.error ?? `${label} failed`);
          return;
        }
        toast.success(json.result?.message ?? `${label} complete`);
        load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${label} failed`);
      }
    });
  }

  const d = data?.dashboard;

  return (
    <section className="mt-10 rounded-2xl border border-violet-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Historical Evidence Resolution 4.2</h2>
          <p className="mt-1 text-sm text-slate-300">
            Verified sale evidence &amp; outcome resolution — deterministic, auditable, never
            fabricated.
          </p>
          {data?.version ? (
            <p className="mt-1 text-[11px] text-slate-500">
              {data.version} · resolver {data.resolverVersion}
            </p>
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

      {d ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            <Stat label="Historical events" value={d.totalHistoricalEvents} />
            <Stat label="Unresolved" value={d.unresolved} />
            <Stat label="Source found" value={d.sourceFound} />
            <Stat label="Extracted" value={d.extracted} />
            <Stat label="Verified SOLD" value={d.verifiedSold} />
            <Stat label="SOLD w/o price" value={d.soldWithoutPrice} />
            <Stat label="Verified sale prices" value={d.verifiedSalePrices} />
            <Stat label="Review required" value={d.reviewRequired} />
            <Stat label="Identity pending" value={d.identityPending} />
            <Stat label="Conflicts" value={d.conflicts} />
            <Stat label="Comparable ready" value={d.comparableReady} />
            <Stat
              label="Market stats"
              value={d.marketStatisticsAvailable ? "Available" : "Insufficient data"}
            />
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-300">Evidence confidence</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-4 text-xs">
              <Stat label="HIGH" value={d.evidenceConfidence.high} />
              <Stat label="MEDIUM" value={d.evidenceConfidence.medium} />
              <Stat label="LOW" value={d.evidenceConfidence.low} />
              <Stat label="INSUFFICIENT" value={d.evidenceConfidence.insufficient} />
            </div>
          </div>
        </>
      ) : null}

      {data?.publicSafety ? (
        <p className="mt-4 text-xs text-slate-400">
          Public catalogue leaks:{" "}
          <span className={data.publicSafety.ok ? "text-emerald-400" : "text-red-400"}>
            {data.publicSafety.catalogueLeaks}
          </span>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void post({ action: "resolve_batch", limit: 10 }, "Resolve batch")}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium hover:bg-violet-600 disabled:opacity-50"
        >
          Resolve batch
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void post({ action: "rebuild" }, "Rebuild resolution corpus")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Rebuild intelligence
        </button>
      </div>

      {data?.events && data.events.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Resolution queue (top 50)</h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400">
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Town</th>
                <th className="py-2 pr-3">State</th>
                <th className="py-2 pr-3">Outcome</th>
                <th className="py-2 pr-3">Quality</th>
                <th className="py-2">Review</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((row) => {
                const eventId =
                  row.auctionEventId ?? row.listingPropertyId ?? row.observationId;
                return (
                  <tr key={row.observationId} className="border-b border-slate-700/50">
                    <td className="py-2 pr-3 font-mono">{eventId.slice(0, 8)}…</td>
                    <td className="py-2 pr-3">{row.town ?? "—"}</td>
                    <td className="py-2 pr-3">{row.state}</td>
                    <td className="py-2 pr-3">{row.outcome}</td>
                    <td className="py-2 pr-3">{row.evidenceQuality}</td>
                    <td className="py-2">
                      <Link
                        href={`/admin/operations/historical-resolution/${eventId}`}
                        className="text-violet-300 hover:underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
