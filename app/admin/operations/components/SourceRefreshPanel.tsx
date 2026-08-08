"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type QueueRow = {
  propertyId: string | null;
  title: string;
  partner: string | null;
  sourceUrl: string | null;
  lastFetch: string | null;
  lastChange: string | null;
  status: string;
  fieldsUpdated: number;
  documentsChanged: number;
  conflicts: number;
  error: string | null;
  contentHash: string | null;
  previousHash: string | null;
  health: string;
  changeClasses: string[];
};

type InitialRow = {
  propertyId: string;
  title: string;
  partner: string | null;
  sourceUrl: string | null;
  listingStatus: string | null;
};

export default function SourceRefreshPanel({
  initialRows,
}: {
  initialRows: InitialRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  async function loadQueue() {
    const res = await fetch("/api/admin/operations/source-refetch?limit=40");
    const data = await res.json();
    if (res.ok) {
      setQueue((data?.data?.rows ?? data?.rows ?? []) as QueueRow[]);
    }
  }

  function refreshProperty(propertyId: string) {
    if (busyId || batchBusy) return;
    setBusyId(propertyId);
    toast.message("Refreshing source...");
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/operations/source-refetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "refresh_property",
            propertyId,
            force: true,
          }),
        });
        const data = await res.json();
        const result = data?.data ?? data;
        if (!res.ok) {
          toast.error(result?.error ?? "Refresh failed");
          setLastMessage(result?.error ?? "Refresh failed");
          return;
        }
        toast.success(result?.message ?? "Source refresh complete");
        setLastMessage(result?.message ?? null);
        await loadQueue();
      } catch {
        toast.error("Refresh failed");
      } finally {
        setBusyId(null);
      }
    });
  }

  function refreshUpcoming() {
    if (busyId || batchBusy) return;
    setBatchBusy(true);
    toast.message("Refreshing upcoming sources...");
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/operations/source-refetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "refresh_upcoming",
            limit: 10,
            force: false,
          }),
        });
        const data = await res.json();
        const result = data?.data ?? data;
        if (!res.ok) {
          toast.error(result?.error ?? "Batch refresh failed");
          return;
        }
        toast.success(result?.message ?? "Batch refresh complete");
        setLastMessage(result?.message ?? null);
        await loadQueue();
      } catch {
        toast.error("Batch refresh failed");
      } finally {
        setBatchBusy(false);
      }
    });
  }

  const displayRows =
    queue.length > 0
      ? queue
      : initialRows.map((r) => ({
          propertyId: r.propertyId,
          title: r.title,
          partner: r.partner,
          sourceUrl: r.sourceUrl,
          lastFetch: null,
          lastChange: null,
          status: r.listingStatus ?? "eligible",
          fieldsUpdated: 0,
          documentsChanged: 0,
          conflicts: 0,
          error: null,
          contentHash: null,
          previousHash: null,
          health: "UNKNOWN",
          changeClasses: [],
        }));

  const reviewRows = displayRows.filter(
    (r) =>
      r.conflicts > 0 ||
      r.changeClasses.some((c) =>
        ["AUCTION_DATE_CHANGED", "CONFLICT_REVIEW_REQUIRED"].includes(c),
      ),
  );

  const busy = pending || Boolean(busyId) || batchBusy;

  return (
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Source Refresh / Enrichment</h2>
          <p className="mt-1 text-sm text-slate-300">
            Licensed re-fetch → snapshot → hash → change detection → due
            diligence extraction. Verified values are never silently overwritten.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void loadQueue()}
            className="rounded-lg border border-slate-500 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            Load Queue
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={refreshUpcoming}
            className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-bold text-slate-900 disabled:opacity-50"
          >
            {batchBusy ? "Refreshing…" : "Refresh Upcoming"}
          </button>
        </div>
      </div>

      {lastMessage ? (
        <p className="mt-3 text-xs text-slate-300" role="status">
          {lastMessage}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-2 py-2">Property</th>
              <th className="px-2 py-2">Partner</th>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Last Fetch</th>
              <th className="px-2 py-2">Last Change</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Fields</th>
              <th className="px-2 py-2">Docs</th>
              <th className="px-2 py-2">Conflicts</th>
              <th className="px-2 py-2">Errors</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.slice(0, 25).map((row) => (
              <tr
                key={row.propertyId ?? row.title}
                className="border-t border-slate-700/80"
              >
                <td className="max-w-[12rem] truncate px-2 py-2 font-medium">
                  {row.title}
                </td>
                <td className="px-2 py-2">{row.partner ?? "—"}</td>
                <td className="max-w-[10rem] truncate px-2 py-2">
                  {row.sourceUrl ? (
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-300 underline"
                    >
                      Open Source
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  {row.lastFetch
                    ? new Date(row.lastFetch).toLocaleString("en-ZA")
                    : "—"}
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  {row.lastChange
                    ? new Date(row.lastChange).toLocaleString("en-ZA")
                    : "—"}
                </td>
                <td className="px-2 py-2">{row.status}</td>
                <td className="px-2 py-2">{row.fieldsUpdated}</td>
                <td className="px-2 py-2">{row.documentsChanged}</td>
                <td className="px-2 py-2">{row.conflicts}</td>
                <td className="max-w-[8rem] truncate px-2 py-2 text-red-300">
                  {row.error ?? "—"}
                </td>
                <td className="space-x-2 whitespace-nowrap px-2 py-2">
                  {row.propertyId ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => refreshProperty(row.propertyId!)}
                        className="underline text-gold-400 disabled:opacity-50"
                      >
                        {busyId === row.propertyId ? "…" : "Refresh"}
                      </button>
                      <Link
                        href={`/properties/${row.propertyId}`}
                        className="underline text-gold-400"
                      >
                        Open Property
                      </Link>
                      <Link
                        href={`/admin/verification?property=${row.propertyId}`}
                        className="underline text-sky-300"
                      >
                        Review
                      </Link>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reviewRows.length > 0 ? (
        <div className="mt-6 rounded-xl border border-amber-600/50 bg-amber-950/40 p-4">
          <h3 className="text-sm font-bold text-amber-200">Change Review</h3>
          <p className="mt-1 text-xs text-amber-100/80">
            Important changes require admin approval. Verified values were not
            overwritten.
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            {reviewRows.slice(0, 10).map((row) => (
              <li
                key={`review-${row.propertyId}`}
                className="rounded-lg border border-amber-700/40 bg-slate-900/50 p-3"
              >
                <div className="font-semibold">{row.title}</div>
                <div className="mt-1 text-slate-300">
                  Classes: {row.changeClasses.join(", ") || "—"} · Conflicts:{" "}
                  {row.conflicts}
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {row.propertyId ? (
                    <Link
                      href={`/admin/verification?property=${row.propertyId}`}
                      className="underline text-gold-400"
                    >
                      Approve / Reject in Verification
                    </Link>
                  ) : null}
                  {row.sourceUrl ? (
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-sky-300"
                    >
                      Open Source
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
