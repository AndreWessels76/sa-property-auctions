"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

type DeltaRow = {
  metric: string;
  before: number;
  after: number;
  delta: number;
};

const ACTIONS: Array<{
  action: string;
  label: string;
  confirmRequired: boolean;
  writes: boolean;
}> = [
  { action: "resolve_evidence", label: "Resolve Evidence (max 5)", confirmRequired: true, writes: true },
  { action: "quality_audit", label: "Quality Audit (max 5)", confirmRequired: true, writes: true },
  { action: "dry_run_acquisition", label: "Dry Run Acquisition (max 5)", confirmRequired: false, writes: false },
  { action: "acquire", label: "Acquire (max 5)", confirmRequired: true, writes: true },
  { action: "retry", label: "Retry (max 5)", confirmRequired: true, writes: true },
  { action: "results_feed_dry_run", label: "Results Feed Dry Run (max 5)", confirmRequired: false, writes: false },
];

export default function AciActionPanel({
  rebuildAllowed,
  catalogueLeaks,
}: {
  rebuildAllowed: boolean;
  catalogueLeaks: number;
}) {
  const [pending, startTransition] = useTransition();
  const [delta, setDelta] = useState<DeltaRow[] | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  function run(action: string, confirmRequired: boolean) {
    if (confirmRequired) {
      const ok = window.confirm(
        `Run ${action} with maximum 5 records? This may write production evidence.`,
      );
      if (!ok) return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/aci/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, limit: 5, confirm: true, records: [] }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        delta?: DeltaRow[];
        writes?: boolean;
        action?: string;
      };
      if (!json.ok) {
        toast.error(json.error ?? "Action blocked");
        setLastMessage(json.error ?? "Action blocked");
        return;
      }
      toast.success(`${json.action} complete`);
      setLastMessage(`${json.action} — writes: ${json.writes ? "YES" : "NO"}`);
      setDelta(json.delta ?? null);
    });
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Operator actions</h2>
      <p className="mt-1 text-sm text-slate-500">
        Bounded to 5 records. Production writes require confirmation. No automatic second batch.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {ACTIONS.map((item) => (
          <button
            key={item.action}
            type="button"
            disabled={pending}
            onClick={() => run(item.action, item.confirmRequired)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          disabled={pending || !rebuildAllowed}
          onClick={() => run("rebuild", true)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {rebuildAllowed ? "Rebuild catalogue" : "PUBLIC CATALOGUE BLOCKED"}
        </button>
      </div>
      {catalogueLeaks > 0 ? (
        <p className="mt-3 text-sm font-semibold text-red-700">
          PUBLIC CATALOGUE BLOCKED — catalogueLeaks = {catalogueLeaks}
        </p>
      ) : null}
      {lastMessage ? <p className="mt-3 text-sm text-slate-600">{lastMessage}</p> : null}
      {delta ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2 pr-4">Metric</th>
                <th className="py-2 pr-4">BEFORE</th>
                <th className="py-2 pr-4">AFTER</th>
                <th className="py-2">DELTA</th>
              </tr>
            </thead>
            <tbody>
              {delta.map((row) => (
                <tr key={row.metric} className="border-b border-slate-100">
                  <td className="py-1.5 pr-4">{row.metric}</td>
                  <td className="py-1.5 pr-4">{row.before}</td>
                  <td className="py-1.5 pr-4">{row.after}</td>
                  <td className="py-1.5">{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
