"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

type Dashboard = {
  ok: boolean;
  error?: string;
  historicalEvents?: number;
  outcomeVerified?: number;
  outcomeUnknown?: number;
  salePriceVerified?: number;
  salePriceMissing?: number;
  outcomeCoveragePct?: number | null;
  salePriceCoveragePct?: number | null;
  enrichment?: {
    runs: number;
    outcomesExtracted: number;
    salePricesExtracted: number;
    noChange: number;
    reviewQueue: number;
  };
  reviewQueue?: Array<{
    id: string;
    category: string;
    property_id: string | null;
    evidence_text: string | null;
    extracted_value: string | null;
    confidence: string | null;
  }>;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-900/50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function HistoricalOutcomeEnrichmentPanel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [propertyId, setPropertyId] = useState("");

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-enrichment", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load enrichment dashboard");
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

  async function runBatch() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-enrichment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "batch", scope: "historical", limit: 5 }),
        });
        const json = await res.json();
        if (!json.ok) setError(json.error ?? json.message ?? "Batch failed");
        else load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Batch failed");
      }
    });
  }

  async function runSingle(mode: "refetch" | "snapshot") {
    if (!propertyId.trim()) {
      setError("Property ID required");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-enrichment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: propertyId.trim(),
            action: mode === "snapshot" ? "extract_snapshot" : "refresh",
          }),
        });
        const json = await res.json();
        if (!json.ok) setError(json.message ?? json.error ?? "Enrichment failed");
        else load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Enrichment failed");
      }
    });
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Historical Outcome Enrichment (3.1)</h2>
          <p className="mt-1 text-sm text-slate-300">
            Refetch licensed sources, extract verified outcomes and sale prices.
            Never fabricates — conflicts go to review.
          </p>
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
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
          <Stat label="Historical events" value={data.historicalEvents ?? 0} />
          <Stat label="Outcome verified" value={data.outcomeVerified ?? 0} />
          <Stat label="Outcome unknown" value={data.outcomeUnknown ?? 0} />
          <Stat label="Sale price verified" value={data.salePriceVerified ?? 0} />
          <Stat label="Outcome coverage" value={
            data.outcomeCoveragePct != null ? `${data.outcomeCoveragePct}%` : "—"
          } />
          <Stat label="Review queue" value={data.enrichment?.reviewQueue ?? 0} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runBatch}
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
        >
          Enrich historical batch (5)
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
          onClick={() => runSingle("refetch")}
          disabled={pending}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Refresh source
        </button>
        <button
          type="button"
          onClick={() => runSingle("snapshot")}
          disabled={pending}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Extract from snapshot
        </button>
      </div>

      {data?.reviewQueue && data.reviewQueue.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400">
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {data.reviewQueue.slice(0, 8).map((row) => (
                <tr key={row.id} className="border-b border-slate-700/50">
                  <td className="py-2 pr-3">{row.category}</td>
                  <td className="py-2 pr-3">{row.extracted_value ?? "—"}</td>
                  <td className="py-2 text-slate-400">{row.evidence_text?.slice(0, 80) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
