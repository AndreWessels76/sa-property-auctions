"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  dashboard?: {
    historicalEvents: number;
    verifiedSales: number;
    verifiedSalePrices: number;
    comparableReadyEvents: number;
    marketReadyTowns: number;
    marketReadyAgencies: number;
    evidenceQualityHigh: number;
    openConflicts: number;
    reviewRequired: number;
    insufficientData: number;
  };
  gapsPreview?: Array<{
    town: string | null;
    verifiedSales: number;
    required: number;
    gap: number;
    recommendedAction: string;
    priority: string;
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

export default function InvestorIntelligence45Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/investor", { cache: "no-store" });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load II 4.5 dashboard");
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
        const res = await fetch("/api/admin/intelligence/investor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
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

  const d = data?.dashboard;

  return (
    <section className="mt-10 rounded-2xl border border-emerald-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Investor Intelligence 4.5</h2>
          <p className="mt-1 text-sm text-slate-300">
            Market intelligence and investor decision layer — evidence only, never
            fabricated prices or investment advice.
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

      {d ? (
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Historical events" value={d.historicalEvents} />
          <Stat label="Verified sales" value={d.verifiedSales} />
          <Stat label="Verified sale prices" value={d.verifiedSalePrices} />
          <Stat label="Comparable-ready" value={d.comparableReadyEvents} />
          <Stat label="Market-ready towns" value={d.marketReadyTowns} />
          <Stat label="Market-ready agencies" value={d.marketReadyAgencies} />
          <Stat label="High evidence quality" value={d.evidenceQualityHigh} />
          <Stat label="Open conflicts" value={d.openConflicts} />
          <Stat label="Review required" value={d.reviewRequired} />
          <Stat label="Insufficient data" value={d.insufficientData} />
        </dl>
      ) : null}

      {data?.publicSafety ? (
        <p className="mt-4 text-xs text-slate-400">
          Public catalogue leaks: {data.publicSafety.catalogueLeaks}{" "}
          {data.publicSafety.ok ? "✓" : "⚠"}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => post("market_audit", "Market intelligence audit")}
          className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          Run Market Intelligence Audit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("rebuild", "Rebuild investor intelligence")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Rebuild Investor Intelligence
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("refresh_gaps", "Refresh gap queue")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Refresh Insufficient Data Queue
        </button>
        <Link
          href="/admin/operations"
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600"
        >
          Review Conflicts / HEQ 4.4 ↓
        </Link>
      </div>

      {data?.gapsPreview?.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-300">Acquisition gaps (preview)</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {data.gapsPreview.slice(0, 5).map((g, i) => (
              <li key={`${g.town}-${i}`}>
                {g.town ?? "Unknown"}: {g.verifiedSales}/{g.required} verified sales —{" "}
                {g.recommendedAction} ({g.priority})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
