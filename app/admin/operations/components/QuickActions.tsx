"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type RunAllResult = {
  ok?: boolean;
  runId?: string;
  message?: string;
  connectorsTotal?: number;
  attempted?: number;
  skipped?: number;
  successful?: number;
  imported?: number;
  pendingVerification?: number;
  duplicates?: number;
  rejected?: number;
  errors?: number;
  durationMs?: number;
  connectors?: Array<{
    id: string;
    name: string;
    status: string;
    reason?: string;
  }>;
  error?: string;
};

type SheriffResult = {
  ok?: boolean;
  configured?: boolean;
  message?: string;
  runId?: string | null;
  error?: string;
};

type RefetchBatchResult = {
  ok?: boolean;
  runId?: string;
  message?: string;
  processed?: number;
  completed?: number;
  changed?: number;
  noChange?: number;
  conflicts?: number;
  skippedLicense?: number;
  skippedRobots?: number;
  skippedOther?: number;
  unavailable?: number;
  failed?: number;
  error?: string;
};

/** Stable destinations — verified against app routes. */
export const QUICK_ACTION_ROUTES = {
  sources: "/admin/acquisition",
  analytics: "/intelligence",
} as const;

/** Visible label — used by regression selftests. */
export const REFRESH_UPCOMING_SOURCES_LABEL = "Refresh Upcoming Sources";

/** Backend endpoint for the refresh quick action. */
export const SOURCE_REFETCH_API = "/api/admin/operations/source-refetch";

export default function QuickActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [runningAll, setRunningAll] = useState(false);
  const [runningSheriff, setRunningSheriff] = useState(false);
  const [runningRefetch, setRunningRefetch] = useState(false);
  const [lastRun, setLastRun] = useState<RunAllResult | null>(null);
  const [lastRefetch, setLastRefetch] = useState<RefetchBatchResult | null>(null);

  async function runAllImports() {
    if (runningAll || runningSheriff || runningRefetch) return;
    setRunningAll(true);
    setLastRun(null);
    toast.message("Running imports...");

    try {
      const res = await fetch("/api/admin/operations/quick-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_all_imports" }),
      });
      const data = (await res.json()) as RunAllResult;

      if (!res.ok) {
        const msg =
          data.error ??
          (res.status === 401
            ? "You must sign in to perform this action."
            : res.status === 403
              ? "You are not authorized to perform this action."
              : "Import failed. Please check the import logs.");
        toast.error(msg);
        setLastRun({ message: msg, ok: false });
        return;
      }

      setLastRun(data);
      if (data.attempted === 0) {
        toast.message(data.message ?? "No eligible connectors are currently available.");
      } else if (data.ok === false) {
        toast.error(data.message ?? "Import failed. Please check the import logs.");
      } else {
        toast.success(data.message ?? "Imports completed successfully.");
      }
    } catch {
      toast.error("Import failed. Please check the import logs.");
      setLastRun({ ok: false, message: "Import failed. Please check the import logs." });
    } finally {
      setRunningAll(false);
    }
  }

  async function runSheriffImport() {
    if (runningAll || runningSheriff || runningRefetch) return;
    setRunningSheriff(true);
    toast.message("Running Sheriff Import...");

    try {
      const res = await fetch("/api/admin/operations/quick-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_sheriff_import" }),
      });
      const data = (await res.json()) as SheriffResult;

      if (!res.ok) {
        const msg =
          data.error ??
          (res.status === 403
            ? "You are not authorized to perform this action."
            : "Sheriff import failed.");
        toast.error(msg);
        return;
      }

      if (data.configured === false) {
        toast.message(data.message ?? "Sheriff import is not configured yet.");
      } else {
        toast.success(data.message ?? "Sheriff import completed.");
      }
    } catch {
      toast.error("Sheriff connector is not configured.");
    } finally {
      setRunningSheriff(false);
    }
  }

  async function refreshUpcomingSources() {
    if (runningAll || runningSheriff || runningRefetch) return;
    setRunningRefetch(true);
    setLastRefetch(null);
    toast.message("Refreshing upcoming sources...");

    try {
      const res = await fetch(SOURCE_REFETCH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refresh_upcoming",
          limit: 10,
          force: false,
        }),
      });
      const data = (await res.json()) as RefetchBatchResult;
      const result = (data as { data?: RefetchBatchResult }).data ?? data;

      if (!res.ok) {
        const msg =
          result.error ??
          (res.status === 401
            ? "You must sign in to perform this action."
            : res.status === 403
              ? "You are not authorized to perform this action."
              : "Source refresh failed.");
        toast.error(msg);
        setLastRefetch({ ok: false, message: msg });
        return;
      }

      setLastRefetch(result);
      if ((result.processed ?? 0) === 0) {
        toast.message(result.message ?? "No eligible sources to refresh.");
      } else if (result.ok === false) {
        toast.error(result.message ?? "Source refresh completed with errors.");
      } else {
        toast.success(result.message ?? "Source refresh completed.");
      }
    } catch {
      toast.error("Source refresh failed.");
      setLastRefetch({ ok: false, message: "Source refresh failed." });
    } finally {
      setRunningRefetch(false);
    }
  }

  function openSources() {
    toast.message("Opening Sources...");
    startTransition(() => {
      router.push(QUICK_ACTION_ROUTES.sources);
    });
  }

  function viewAnalytics() {
    toast.message("Opening Analytics...");
    startTransition(() => {
      router.push(QUICK_ACTION_ROUTES.analytics);
    });
  }

  const busy = runningAll || runningSheriff || runningRefetch || pending;

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h2 className="mb-5 text-xl font-bold">Quick Actions</h2>

      <div className="grid gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAllImports()}
          className="rounded-xl bg-gold-500 py-3 font-semibold text-navy-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {runningAll ? "Running Imports..." : "Run All Imports"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void runSheriffImport()}
          className="rounded-xl border py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {runningSheriff ? "Running Sheriff Import..." : "Run Sheriff Import"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={openSources}
          className="rounded-xl border py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          Open Sources
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={viewAnalytics}
          className="rounded-xl border py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          View Analytics
        </button>

        <button
          type="button"
          data-testid="refresh-upcoming-sources"
          disabled={busy}
          onClick={() => void refreshUpcomingSources()}
          aria-busy={runningRefetch}
          className="rounded-xl border py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {runningRefetch ? "Refreshing Sources..." : REFRESH_UPCOMING_SOURCES_LABEL}
        </button>
      </div>

      {lastRun ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <h3 className="font-bold text-navy-900">Import Run Complete</h3>
          <p className="mt-1 text-xs text-slate-600">{lastRun.message}</p>
          <table className="mt-3 w-full text-left text-xs">
            <tbody>
              {(
                [
                  ["Connectors", lastRun.connectorsTotal],
                  ["Attempted", lastRun.attempted],
                  ["Skipped", lastRun.skipped],
                  ["Imported", lastRun.imported],
                  ["Pending verification", lastRun.pendingVerification],
                  ["Duplicates", lastRun.duplicates],
                  ["Rejected", lastRun.rejected],
                  ["Errors", lastRun.errors],
                ] as const
              ).map(([label, value]) =>
                value != null ? (
                  <tr key={label} className="border-t border-slate-200">
                    <td className="py-1 text-slate-500">{label}</td>
                    <td className="py-1 text-right font-semibold text-navy-900">
                      {value}
                    </td>
                  </tr>
                ) : null,
              )}
            </tbody>
          </table>
          {lastRun.runId ? (
            <p className="mt-2 text-[11px] text-slate-400">Run ID: {lastRun.runId}</p>
          ) : null}
          {lastRun.connectors && lastRun.connectors.length > 0 ? (
            <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-[11px] text-slate-600">
              {lastRun.connectors.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold">{c.name}</span> — {c.status}
                  {c.reason ? `: ${c.reason}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {lastRefetch ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <h3 className="font-bold text-navy-900">Source Refresh Complete</h3>
          <p className="mt-1 text-xs text-slate-600">{lastRefetch.message}</p>
          {(lastRefetch.processed ?? 0) === 0 && lastRefetch.ok !== false ? (
            <p className="mt-2 text-xs font-medium text-amber-800">
              No eligible upcoming/live licensed sources were available to refresh.
            </p>
          ) : null}
          <table className="mt-3 w-full text-left text-xs">
            <tbody>
              {(
                [
                  ["Attempted", lastRefetch.processed],
                  ["Fetched", lastRefetch.completed],
                  ["No change", lastRefetch.noChange],
                  ["Changed", lastRefetch.changed],
                  ["Skipped license", lastRefetch.skippedLicense],
                  ["Skipped robots", lastRefetch.skippedRobots],
                  ["Skipped other", lastRefetch.skippedOther],
                  ["Unavailable", lastRefetch.unavailable],
                  ["Failed", lastRefetch.failed],
                  ["Conflicts", lastRefetch.conflicts],
                  ["Extraction runs", lastRefetch.completed],
                ] as const
              ).map(([label, value]) =>
                value != null ? (
                  <tr key={label} className="border-t border-slate-200">
                    <td className="py-1 text-slate-500">{label}</td>
                    <td className="py-1 text-right font-semibold text-navy-900">
                      {value}
                    </td>
                  </tr>
                ) : null,
              )}
            </tbody>
          </table>
          {lastRefetch.runId ? (
            <p className="mt-2 text-[11px] text-slate-400">
              Run ID: {lastRefetch.runId}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
