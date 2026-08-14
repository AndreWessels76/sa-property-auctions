"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

type CoverageMetric = {
  label: string;
  numerator: number;
  denominator: number;
  ratio: number | null;
};

type ConflictRow = {
  id: string;
  property_id: string | null;
  field_name: string;
  old_value: number | null;
  new_value: number | null;
  old_source: string | null;
  new_source: string | null;
  old_evidence: string | null;
  new_evidence: string | null;
  status: string;
  created_at: string;
};

type Payload = {
  ok: boolean;
  coverage?: {
    metrics: CoverageMetric[];
    bySource: Array<{
      source: string;
      listings: number;
      withAuctionPrice: number;
      withGuidePrice: number;
      withFloorSize: number;
      withHectares: number;
    }>;
    openConflicts: number;
    observationCount: number;
    tableAvailable: boolean;
  };
  conflicts?: ConflictRow[];
  error?: string;
};

function pct(m: CoverageMetric): string {
  if (m.ratio == null) return "n/a";
  return `${Math.round(m.ratio * 100)}% (${m.numerator}/${m.denominator})`;
}

export default function PricingAcquisitionPanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/acquisition/pricing", {
          cache: "no-store",
        });
        const json = (await res.json()) as Payload;
        if (!json.ok) {
          setError(json.error ?? "Failed to load pricing coverage");
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

  async function act(
    action: string,
    conflictId: string,
    observationId?: string,
  ) {
    startTransition(async () => {
      await fetch("/api/admin/acquisition/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, conflictId, observationId }),
      });
      load();
    });
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Pricing Data Acquisition</h2>
          <p className="mt-1 text-sm text-slate-300">
            Coverage uses numerator/denominator — never bare percentages.
            Conflicts require admin review; verified values are never silently
            overwritten.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          {pending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-amber-300">{error}</p>
      ) : null}

      {data?.coverage ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="rounded-lg bg-slate-900/50 p-3">
              <div className="text-slate-400">Observations</div>
              <div className="text-lg font-semibold">
                {data.coverage.observationCount}
              </div>
              <div className="text-xs text-slate-500">
                {data.coverage.tableAvailable
                  ? "table available"
                  : "migration pending"}
              </div>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-3">
              <div className="text-slate-400">Open conflicts</div>
              <div className="text-lg font-semibold">
                {data.coverage.openConflicts}
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-2 py-2">Metric</th>
                  <th className="px-2 py-2">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {data.coverage.metrics.map((m) => (
                  <tr key={m.label} className="border-t border-slate-700/80">
                    <td className="px-2 py-2">{m.label}</td>
                    <td className="px-2 py-2 font-mono">{pct(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 text-sm font-semibold text-slate-200">
            By source
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-2 py-2">Source</th>
                  <th className="px-2 py-2">Listings</th>
                  <th className="px-2 py-2">Auction price</th>
                  <th className="px-2 py-2">Floor size</th>
                  <th className="px-2 py-2">Hectares</th>
                </tr>
              </thead>
              <tbody>
                {data.coverage.bySource.slice(0, 12).map((s) => (
                  <tr key={s.source} className="border-t border-slate-700/80">
                    <td className="px-2 py-2">{s.source}</td>
                    <td className="px-2 py-2">{s.listings}</td>
                    <td className="px-2 py-2">
                      {s.withAuctionPrice}/{s.listings}
                    </td>
                    <td className="px-2 py-2">
                      {s.withFloorSize}/{s.listings}
                    </td>
                    <td className="px-2 py-2">
                      {s.withHectares}/{s.listings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <h3 className="mt-6 text-sm font-semibold text-slate-200">
        Pricing conflicts
      </h3>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-2 py-2">Field</th>
              <th className="px-2 py-2">Old</th>
              <th className="px-2 py-2">New</th>
              <th className="px-2 py-2">Evidence</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.conflicts ?? []).length === 0 ? (
              <tr className="border-t border-slate-700/80">
                <td className="px-2 py-3 text-slate-400" colSpan={5}>
                  No open pricing conflicts
                </td>
              </tr>
            ) : (
              (data?.conflicts ?? []).map((c) => (
                <tr key={c.id} className="border-t border-slate-700/80">
                  <td className="px-2 py-2">
                    <div className="font-medium">{c.field_name}</div>
                    <div className="text-slate-500 truncate max-w-[10rem]">
                      {c.property_id}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    {c.old_value ?? "—"}
                    <div className="text-slate-500">{c.old_source}</div>
                  </td>
                  <td className="px-2 py-2">
                    {c.new_value ?? "—"}
                    <div className="text-slate-500">{c.new_source}</div>
                  </td>
                  <td className="px-2 py-2 max-w-[14rem] truncate">
                    {c.new_evidence ?? c.old_evidence ?? "—"}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap space-x-1">
                    <button
                      type="button"
                      className="text-emerald-400 hover:underline"
                      onClick={() => act("approve", c.id, c.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="text-slate-300 hover:underline"
                      onClick={() => act("keep_existing", c.id)}
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      className="text-rose-300 hover:underline"
                      onClick={() => act("reject", c.id)}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="text-amber-300 hover:underline"
                      onClick={() => act("request_refetch", c.id)}
                    >
                      Re-fetch
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
