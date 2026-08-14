"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  dashboard?: {
    totalHistoricalEvents: number;
    highQuality: number;
    mediumQuality: number;
    lowQuality: number;
    reviewRequired: number;
    conflicts: number;
    insufficientData: number;
    verifiedSold: number;
    verifiedSalePrices: number;
    confirmedOutcomes: number;
    sourceCoverage: number;
    snapshotCoverage: number;
    comparableReady: number;
    reviewQueue: { p1: number; p2: number; p3: number; p4: number; total: number };
  };
  queuePreview?: Array<{
    priority: number;
    auctionEventId: string | null;
    listingPropertyId: string | null;
    town: string | null;
    overallQuality: string;
    reason: string;
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

export default function HistoricalEvidenceQuality44Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-evidence-quality", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HEQ 4.4 dashboard");
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
        const res = await fetch("/api/admin/intelligence/historical-evidence-quality", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
    <section className="mt-10 rounded-2xl border border-sky-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Historical Evidence Quality 4.4</h2>
          <p className="mt-1 text-sm text-slate-300">
            Deterministic evidence quality, field provenance, and admin review — never
            fabricated.
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

      {d ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            <Stat label="Historical events" value={d.totalHistoricalEvents} />
            <Stat label="High quality" value={d.highQuality} />
            <Stat label="Medium quality" value={d.mediumQuality} />
            <Stat label="Low quality" value={d.lowQuality} />
            <Stat label="Review required" value={d.reviewRequired} />
            <Stat label="Conflicts" value={d.conflicts} />
            <Stat label="Insufficient data" value={d.insufficientData} />
            <Stat label="Verified SOLD" value={d.verifiedSold} />
            <Stat label="Verified sale prices" value={d.verifiedSalePrices} />
            <Stat label="Confirmed outcomes" value={d.confirmedOutcomes} />
            <Stat label="Source coverage %" value={d.sourceCoverage} />
            <Stat label="Snapshot coverage %" value={d.snapshotCoverage} />
            <Stat label="Comparable ready" value={d.comparableReady} />
            <Stat
              label="Public catalogue leaks"
              value={data?.publicSafety?.catalogueLeaks ?? 0}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
            <Stat label="Review P1" value={d.reviewQueue.p1} />
            <Stat label="Review P2" value={d.reviewQueue.p2} />
            <Stat label="Review P3" value={d.reviewQueue.p3} />
            <Stat label="Review P4" value={d.reviewQueue.p4} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => post({ action: "quality_audit" }, "Run quality audit")}
              className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-medium hover:bg-sky-600 disabled:opacity-50"
            >
              Run Quality Audit
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post({ action: "refresh_p1", limit: 5 }, "Refresh P1 evidence")}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              Refresh P1 Evidence (5)
            </button>
            <Link
              href="/admin/operations?view=quality-queue"
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600"
            >
              Open Review Queue
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                post({ action: "rebuild_intelligence" }, "Rebuild historical intelligence")
              }
              className="rounded-lg bg-violet-800 px-3 py-1.5 text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              Rebuild Historical Intelligence
            </button>
          </div>

          {data?.queuePreview && data.queuePreview.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Review queue preview
              </p>
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-2 pr-3">P</th>
                    <th className="py-2 pr-3">Town</th>
                    <th className="py-2 pr-3">Quality</th>
                    <th className="py-2 pr-3">Reason</th>
                    <th className="py-2">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {data.queuePreview.map((row) => (
                    <tr
                      key={`${row.listingPropertyId}-${row.auctionEventId}`}
                      className="border-b border-slate-800/80"
                    >
                      <td className="py-2 pr-3">{row.priority}</td>
                      <td className="py-2 pr-3">{row.town ?? "—"}</td>
                      <td className="py-2 pr-3">{row.overallQuality}</td>
                      <td className="py-2 pr-3 max-w-[240px] truncate">{row.reason}</td>
                      <td className="py-2">
                        {row.auctionEventId ? (
                          <Link
                            href={`/admin/operations/historical-resolution/${row.auctionEventId}`}
                            className="text-sky-400 hover:underline"
                          >
                            Open
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
