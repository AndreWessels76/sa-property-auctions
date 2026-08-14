"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { OPERATIONS_METRICS_REFRESH_EVENT } from "@/lib/operations/metricsRefresh";
import LiveStatCard from "./LiveStatCard";
import ImportStatus from "./ImportStatus";

type Metrics = {
  ok: boolean;
  error?: string;
  properties?: { total: number | null; todayLabel: string };
  images?: { total: number | null; todayLabel: string };
  mergedRecords?: number | null;
  failedImports?: number | null;
  importQueue?: {
    percentage: number;
    label: string;
    total: number;
    completed: number;
    failed: number;
  } | null;
  unavailable?: string[];
  generatedAt?: string;
  saDate?: string;
};

function formatCount(n: number | null | undefined, unavailable?: boolean): string {
  if (unavailable || n == null || !Number.isFinite(n)) return "DATA UNAVAILABLE";
  return n.toLocaleString("en-ZA");
}

export default function LiveOperationsMetrics() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/operations/metrics", { cache: "no-store" });
        const json = (await res.json()) as Metrics;
        if (!json.ok) {
          setError(json.error ?? "Failed to load metrics");
          setData(null);
          return;
        }
        setError(null);
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load metrics");
        setData(null);
      }
    });
  }, []);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener(OPERATIONS_METRICS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(OPERATIONS_METRICS_REFRESH_EVENT, onRefresh);
  }, [load]);

  if (error) {
    return (
      <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-semibold">Live metrics unavailable</p>
        <p className="mt-1 text-sm">{error}</p>
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="mt-3 rounded-lg bg-red-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || pending) {
    return (
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-500">Loading production metrics…</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {["Properties", "Images", "Merged Records", "Failed Imports"].map((title) => (
            <div
              key={title}
              className="animate-pulse rounded-2xl border-l-4 border-slate-200 bg-white p-6 shadow"
            >
              <p className="text-sm text-slate-400">{title}</p>
              <div className="mt-3 h-10 w-24 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const unavailable = new Set(data.unavailable ?? []);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Live production metrics · SA date {data.saDate ?? "—"} · updated{" "}
          {data.generatedAt?.slice(11, 19) ?? "—"} UTC
        </p>
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <LiveStatCard
          title="Properties"
          value={formatCount(data.properties?.total, unavailable.has("propertiesTotal"))}
          change={data.properties?.todayLabel}
          color="green"
        />
        <LiveStatCard
          title="Images"
          value={formatCount(data.images?.total, unavailable.has("imagesTotal"))}
          change={data.images?.todayLabel}
        />
        <LiveStatCard
          title="Merged Records"
          value={formatCount(data.mergedRecords, unavailable.has("mergedRecords"))}
          color="yellow"
        />
        <LiveStatCard
          title="Failed Imports"
          value={formatCount(data.failedImports, unavailable.has("failedImports"))}
          color="red"
        />
      </div>

      {data.importQueue == null || unavailable.has("importQueue") ? (
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-2 text-xl font-bold">Import Queue</h2>
          <p className="text-slate-600">DATA UNAVAILABLE</p>
        </div>
      ) : (
        <ImportStatus
          percentage={data.importQueue.percentage}
          label={data.importQueue.label}
          total={data.importQueue.total}
          completed={data.importQueue.completed}
          failed={data.importQueue.failed}
        />
      )}
    </>
  );
}
