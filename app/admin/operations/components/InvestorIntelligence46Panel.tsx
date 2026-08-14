"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  dashboard?: {
    propertiesAnalysed: number;
    highEvidence: number;
    mediumEvidence: number;
    lowEvidence: number;
    insufficientData: number;
    conflicts: number;
    acquisitionGaps: number;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
  };
  gapsPreview?: Array<{
    gapCode: string;
    priority: string;
    reason: string;
    recommendedExistingQueue: string;
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

export default function InvestorIntelligence46Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/investor", { cache: "no-store" });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load II 4.6 dashboard");
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
    <section className="mt-10 rounded-2xl border border-teal-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Investor Intelligence 4.6</h2>
          <p className="mt-1 text-sm text-slate-300">
            Evidence coverage, acquisition feedback, and research intelligence — never
            investment advice.
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
          <Stat label="Properties analysed" value={d.propertiesAnalysed} />
          <Stat label="High evidence" value={d.highEvidence} />
          <Stat label="Medium evidence" value={d.mediumEvidence} />
          <Stat label="Low evidence" value={d.lowEvidence} />
          <Stat label="Insufficient data" value={d.insufficientData} />
          <Stat label="Conflicts" value={d.conflicts} />
          <Stat label="Acquisition gaps" value={d.acquisitionGaps} />
          <Stat label="P1 gaps" value={d.p1} />
          <Stat label="P2 gaps" value={d.p2} />
          <Stat label="P3 gaps" value={d.p3} />
          <Stat label="P4 gaps" value={d.p4} />
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
          onClick={() => post("refresh_coverage", "Refresh coverage")}
          className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          Refresh Coverage
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("refresh_gaps", "Find acquisition gaps")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Find Acquisition Gaps
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => post("rebuild", "Rebuild intelligence")}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          Rebuild Intelligence
        </button>
        <Link
          href="/admin/operations"
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600"
        >
          View Conflicts / HEQ 4.4 ↓
        </Link>
      </div>

      {data?.gapsPreview?.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-300">Acquisition gaps (preview)</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {data.gapsPreview.slice(0, 5).map((g, i) => (
              <li key={`${g.gapCode}-${i}`}>
                {g.gapCode} ({g.priority}): {g.reason} → {g.recommendedExistingQueue}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
