"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Dashboard = {
  ok?: boolean;
  error?: string;
  version?: string;
  queueSummary?: {
    total: number;
    priority1: number;
    priority2: number;
    priority3: number;
    priority4: number;
    strongIdentity: number;
    weakIdentity: number;
    withSourceUrl: number;
  };
  dashboard?: {
    eventsRequiringEnrichment: number;
    sourceFound: number;
    sourceNotFound: number;
    outcomeExtracted: number;
    salePriceExtracted: number;
    verified: number;
    reviewRequired: number;
    conflicts: number;
    insufficientData: number;
    licenseBlocked: number;
    fetchFailed: number;
  };
  queuePreview?: Array<{
    priority: number;
    propertyId: string;
    auctionEventId: string | null;
    town: string | null;
    agency: string | null;
    reason: string;
    candidateCount: number;
    identityStrength: string;
    sourceUrl: string | null;
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

export default function HistoricalEvidenceAcquisition43Panel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-evidence", {
          cache: "no-store",
        });
        const json = (await res.json()) as Dashboard;
        if (!json.ok) {
          setError(json.error ?? "Failed to load HEA 4.3 dashboard");
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
        const res = await fetch("/api/admin/intelligence/historical-evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.ok) {
          toast.error(json.error ?? `${label} failed`);
          return;
        }
        const dry = json.result?.dryRun ? " (dry run — nothing written)" : "";
        toast.success((json.result?.message ?? `${label} complete`) + dry);
        load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${label} failed`);
      }
    });
  }

  const d = data?.dashboard;
  const q = data?.queueSummary;

  return (
    <section className="mt-10 rounded-2xl border border-emerald-800/60 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Historical Evidence Acquisition 4.3</h2>
          <p className="mt-1 text-sm text-slate-300">
            Licensed source discovery → fetch → extract → Historical Resolution 4.2. Never
            fabricates evidence.
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
            <Stat label="Events requiring enrichment" value={d.eventsRequiringEnrichment} />
            <Stat label="Source found" value={d.sourceFound} />
            <Stat label="Source not found" value={d.sourceNotFound} />
            <Stat label="Outcome extracted" value={d.outcomeExtracted} />
            <Stat label="Sale price extracted" value={d.salePriceExtracted} />
            <Stat label="Verified" value={d.verified} />
            <Stat label="Review required" value={d.reviewRequired} />
            <Stat label="Conflicts" value={d.conflicts} />
            <Stat label="Insufficient data" value={d.insufficientData} />
            <Stat label="License blocked" value={d.licenseBlocked} />
            <Stat label="Fetch failed" value={d.fetchFailed} />
            <Stat
              label="Public catalogue leaks"
              value={data?.publicSafety?.catalogueLeaks ?? 0}
            />
          </div>

          {q ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
              <Stat label="P1 (exact URL)" value={q.priority1} />
              <Stat label="P2 (strong identity)" value={q.priority2} />
              <Stat label="P3 (searchable)" value={q.priority3} />
              <Stat label="P4 (weak discovery)" value={q.priority4} />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => post({ action: "dry_run", limit: 5 }, "Dry run (5 events)")}
              className="rounded-lg bg-amber-700/80 px-3 py-1.5 text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              Dry run (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post({ action: "acquire_p1", limit: 5 }, "Acquire P1 batch")}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              Acquire P1 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post({ action: "acquire_p2", limit: 5 }, "Acquire P2 batch")}
              className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              Acquire P2 (5)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => post({ action: "retry_failed", limit: 5 }, "Retry failed")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              Retry failed (5)
            </button>
          </div>

          {data?.queuePreview && data.queuePreview.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Queue preview (proposed — not persisted)
              </p>
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-2 pr-3">P</th>
                    <th className="py-2 pr-3">Town</th>
                    <th className="py-2 pr-3">Agency</th>
                    <th className="py-2 pr-3">Identity</th>
                    <th className="py-2 pr-3">Candidates</th>
                    <th className="py-2 pr-3">Reason</th>
                    <th className="py-2">Event</th>
                  </tr>
                </thead>
                <tbody>
                  {data.queuePreview.map((row) => (
                    <tr key={row.propertyId} className="border-b border-slate-800/80">
                      <td className="py-2 pr-3">{row.priority}</td>
                      <td className="py-2 pr-3">{row.town ?? "—"}</td>
                      <td className="py-2 pr-3">{row.agency ?? "—"}</td>
                      <td className="py-2 pr-3">{row.identityStrength}</td>
                      <td className="py-2 pr-3">{row.candidateCount}</td>
                      <td className="py-2 pr-3 max-w-[200px] truncate">{row.reason}</td>
                      <td className="py-2">
                        {row.auctionEventId ? (
                          <Link
                            href={`/admin/operations/historical-resolution/${row.auctionEventId}`}
                            className="text-emerald-400 hover:underline"
                          >
                            Review
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
