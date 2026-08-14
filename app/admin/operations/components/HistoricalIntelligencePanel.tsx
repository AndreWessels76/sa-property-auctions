"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

type Audit = {
  ok: boolean;
  error?: string;
  sourceUnits?: { auction_event: number; listing_fallback: number };
  exclusionCounts?: Record<string, number>;
  report?: {
    activity: {
      historicalEvents: number;
      sold: number;
      withdrawn: number;
      cancelled: number;
      expired: number;
      unknownOutcome: number;
    };
    salePrice: {
      median: number | null;
      count: number;
      coverageLabel: string;
      sampleSafetyLabel: string;
    };
    coverage: {
      eventCount: number;
      verifiedCount: number;
      sourceCount: number;
    };
    insufficientMessage: string | null;
  };
};

export default function HistoricalIntelligencePanel() {
  const [data, setData] = useState<Audit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical", {
          cache: "no-store",
        });
        const json = (await res.json()) as Audit;
        if (!json.ok) {
          setError(json.error ?? "Failed to load historical audit");
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

  const activity = data?.report?.activity;

  return (
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Historical Intelligence 2B</h2>
          <p className="mt-1 text-sm text-slate-300">
            Auction Events are the unit of history. Sale price is never inferred
            from auction, guide, or reserve. Exclusions are listed, not silent.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          {pending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-amber-300">{error}</p> : null}

      {activity ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
          <Stat label="Historical events" value={activity.historicalEvents} />
          <Stat label="Sold" value={activity.sold} />
          <Stat label="Withdrawn" value={activity.withdrawn} />
          <Stat label="Cancelled" value={activity.cancelled} />
          <Stat label="Expired" value={activity.expired} />
          <Stat label="Outcome unknown" value={activity.unknownOutcome} />
        </div>
      ) : null}

      {data?.report?.salePrice ? (
        <p className="mt-4 text-sm text-slate-300">
          Median sale price:{" "}
          {data.report.salePrice.median != null
            ? `R${Math.round(data.report.salePrice.median).toLocaleString("en-ZA")}`
            : "Insufficient data"}{" "}
          · {data.report.salePrice.sampleSafetyLabel} · coverage{" "}
          {data.report.salePrice.coverageLabel}
        </p>
      ) : null}

      {data?.sourceUnits ? (
        <p className="mt-2 text-xs text-slate-400">
          Source units: {data.sourceUnits.auction_event} Auction Events,{" "}
          {data.sourceUnits.listing_fallback} listing fallbacks
        </p>
      ) : null}

      {data?.exclusionCounts && Object.keys(data.exclusionCounts).length > 0 ? (
        <div className="mt-4 text-xs text-slate-400">
          Exclusions:{" "}
          {Object.entries(data.exclusionCounts)
            .map(([k, v]) => `${k} ${v}`)
            .join(" · ")}
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-900/50 p-3">
      <div className="text-slate-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
