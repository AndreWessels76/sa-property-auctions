"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

type BackfillAudit = {
  ok: boolean;
  error?: string;
  audit?: {
    latest?: {
      id: string;
      dry_run: boolean;
      run_kind: string;
      status: string;
      records_scanned: number;
      masters_created: number;
      masters_matched: number;
      master_review: number;
      events_created: number;
      events_matched: number;
      duplicates_skipped: number;
      insufficient_evidence: number;
      pricing_linked: number;
      meta?: { masters_proposed?: number; events_proposed?: number } | null;
      started_at: string;
      completed_at: string | null;
    };
    database?: {
      property_masters: number;
      auction_events: number;
      pricing_observations: number;
    };
    pendingReviewCount?: number;
  };
  reviews?: Array<{
    id: string;
    review_kind: string;
    listing_property_id: string;
    identity_decision: string | null;
    confidence: number | null;
    conflict_reason: string | null;
  }>;
  publicSafety?: {
    publicCatalogueCount: number;
    historicalLeaks: number;
    clean: boolean;
  };
};

export default function PropertyHistoryBackfillPanel() {
  const [data, setData] = useState<BackfillAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/history-backfill", {
          cache: "no-store",
        });
        const json = (await res.json()) as BackfillAudit;
        if (!json.ok) {
          setError(json.error ?? "Failed to load backfill audit");
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

  function runAction(action: "preview" | "backfill", dryRun = false) {
    startTransition(async () => {
      setMessage(null);
      try {
        const res = await fetch("/api/admin/intelligence/history-backfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, limit: 200, dryRun }),
        });
        const json = await res.json();
        if (!json.ok) {
          setError(json.error ?? "Action failed");
          return;
        }
        setError(null);
        setMessage(
          action === "preview"
            ? `Dry run: ${json.summary.recordsScanned} scanned, ${json.summary.mastersProposed ?? json.summary.mastersCreated} masters proposed, ${json.summary.eventsProposed ?? json.summary.eventsCreated} events proposed (nothing written)`
            : `Backfill complete: ${json.summary.mastersCreated} masters persisted, ${json.summary.eventsCreated} events persisted`,
        );
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  const latest = data?.audit?.latest;
  const db = data?.audit?.database;
  const proposedMasters =
    latest?.meta?.masters_proposed ??
    (latest?.dry_run ? latest?.masters_created : undefined);
  const proposedEvents =
    latest?.meta?.events_proposed ??
    (latest?.dry_run ? latest?.events_created : undefined);

  return (
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Property History Backfill 1.0</h2>
          <p className="mt-1 text-sm text-slate-300">
            Converts verified listings into Property Masters and Auction Events.
            Uncertain identity matches go to review — nothing is silently merged.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runAction("preview")}
            disabled={pending}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
          >
            Dry run preview
          </button>
          <button
            type="button"
            onClick={() => runAction("backfill")}
            disabled={pending}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
          >
            Execute backfill
          </button>
          <button
            type="button"
            onClick={load}
            disabled={pending}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="rounded-xl bg-slate-900/50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Property masters</dt>
          <dd className="mt-1 text-lg font-semibold">{db?.property_masters ?? "—"}</dd>
        </div>
        <div className="rounded-xl bg-slate-900/50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Auction events</dt>
          <dd className="mt-1 text-lg font-semibold">{db?.auction_events ?? "—"}</dd>
        </div>
        <div className="rounded-xl bg-slate-900/50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Review queue</dt>
          <dd className="mt-1 text-lg font-semibold">
            {data?.audit?.pendingReviewCount ?? "—"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-900/50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Public catalogue</dt>
          <dd className="mt-1 text-lg font-semibold">
            {data?.publicSafety?.clean ? "Clean" : "Check required"}
          </dd>
        </div>
      </dl>

      {latest && (
        <div className="mt-6 rounded-xl bg-slate-900/40 p-4 text-sm">
          <p className="font-medium text-slate-200">
            Last run ({latest.status}
            {latest.dry_run ? " · dry run — no database writes" : " · execute"}
            {latest.run_kind === "preview" ? " · preview" : ""})
          </p>
          <ul className="mt-2 grid gap-1 text-slate-300 sm:grid-cols-2">
            <li>Scanned: {latest.records_scanned}</li>
            {latest.dry_run ? (
              <>
                <li>Masters proposed: {proposedMasters ?? "—"}</li>
                <li>Events proposed: {proposedEvents ?? "—"}</li>
                <li>Masters persisted: 0</li>
                <li>Events persisted: 0</li>
              </>
            ) : (
              <>
                <li>Masters persisted: {latest.masters_created}</li>
                <li>Events persisted: {latest.events_created}</li>
              </>
            )}
            <li>Masters matched: {latest.masters_matched}</li>
            <li>Review required: {latest.master_review}</li>
            <li>Duplicates skipped: {latest.duplicates_skipped}</li>
            <li>Insufficient evidence: {latest.insufficient_evidence}</li>
            <li>Pricing linked: {latest.pricing_linked}</li>
          </ul>
        </div>
      )}

      {(data?.reviews?.length ?? 0) > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-200">Pending reviews</h3>
          <ul className="mt-2 space-y-2 text-xs text-slate-300">
            {data!.reviews!.slice(0, 8).map((r) => (
              <li key={r.id} className="rounded-lg bg-slate-900/40 p-2">
                {r.review_kind} · {r.identity_decision ?? "event"} · conf{" "}
                {r.confidence ?? "—"} · {r.conflict_reason ?? "No reason recorded"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
