"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type ReviewData = {
  ok?: boolean;
  review?: {
    event: {
      auctionEventId: string | null;
      propertyMasterId: string | null;
      listingPropertyId: string | null;
      town: string | null;
      suburb: string | null;
      auctionDate: string | null;
      sourceUrl: string | null;
      sourceName: string | null;
    };
    resolution: {
      state: string;
      label: string | null;
      outcome: string;
      salePrice: number | null;
      evidenceQuality: string;
      recommendedAction: string | null;
      provenance: {
        snapshotId: string | null;
        evidenceText: string | null;
        sourceHash: string | null;
      };
      conflicts: string[];
    };
    openConflicts: Array<{ id: string; claim_a: string; claim_b: string; status: string }>;
  };
};

export default function HistoricalResolutionReviewClient({
  eventId,
}: {
  eventId: string;
}) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/intelligence/historical-resolution/${encodeURIComponent(eventId)}`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as ReviewData;
        if (!json.ok) {
          setError("Event not found");
          return;
        }
        setError(null);
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      }
    });
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(
    resolutionAction:
      | "confirm_sold"
      | "confirm_not_sold"
      | "confirm_sale_price"
      | "reject_evidence"
      | "rerun_extraction",
  ) {
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/intelligence/historical-resolution/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, action: resolutionAction }),
        });
        const json = await res.json();
        if (!json.ok) toast.error(json.error ?? "Action failed");
        else {
          toast.success(json.result?.message ?? "Action recorded");
          load();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  const r = data?.review;
  const ev = r?.event;
  const res = r?.resolution;

  return (
    <div className="mx-auto max-w-4xl p-6 text-white">
      <Link href="/admin/operations" className="text-sm text-violet-300 hover:underline">
        ← Operations Centre
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Historical Evidence Review</h1>
      <p className="mt-1 text-sm text-slate-400">Event {eventId}</p>

      {error ? <p className="mt-4 text-amber-300">{error}</p> : null}

      {r && ev && res ? (
        <div className="mt-6 space-y-6">
          <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <h2 className="font-semibold">Property &amp; event</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Property Master</dt>
                <dd className="font-mono">{ev.propertyMasterId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Auction Event</dt>
                <dd className="font-mono">{ev.auctionEventId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Auction date</dt>
                <dd>{ev.auctionDate ?? "Not supplied"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Location</dt>
                <dd>
                  {[ev.suburb, ev.town].filter(Boolean).join(", ") || "Insufficient data"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <h2 className="font-semibold">Source</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className="text-slate-400">Source URL</dt>
                <dd className="break-all">
                  {ev.sourceUrl ? (
                    <a
                      href={ev.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-300"
                    >
                      {ev.sourceUrl}
                    </a>
                  ) : (
                    "Not supplied"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Snapshot</dt>
                <dd className="font-mono">{res.provenance.snapshotId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Evidence text</dt>
                <dd>{res.provenance.evidenceText ?? "Not supplied"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <h2 className="font-semibold">Resolution</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">State</dt>
                <dd>{res.state}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Outcome</dt>
                <dd>{res.outcome}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Sale price</dt>
                <dd>
                  {res.salePrice != null
                    ? `R ${res.salePrice.toLocaleString()}`
                    : "Not supplied"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Confidence</dt>
                <dd>{res.evidenceQuality}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-400">Recommended</dt>
                <dd>{res.recommendedAction ?? "—"}</dd>
              </div>
            </dl>
          </section>

          {r.openConflicts.length > 0 ? (
            <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
              <h2 className="font-semibold text-red-200">Conflicts</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {r.openConflicts.map((c) => (
                  <li key={c.id}>
                    {c.claim_a} vs {c.claim_b}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void action("confirm_sold")}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs hover:bg-emerald-600 disabled:opacity-50"
            >
              Confirm SOLD
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void action("confirm_not_sold")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs hover:bg-slate-600 disabled:opacity-50"
            >
              Confirm NOT SOLD
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void action("confirm_sale_price")}
              className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs hover:bg-violet-600 disabled:opacity-50"
            >
              Confirm sale price
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void action("reject_evidence")}
              className="rounded-lg bg-red-900/70 px-3 py-1.5 text-xs hover:bg-red-800 disabled:opacity-50"
            >
              Reject evidence
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void action("rerun_extraction")}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs hover:bg-slate-600 disabled:opacity-50"
            >
              Re-run extraction
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
