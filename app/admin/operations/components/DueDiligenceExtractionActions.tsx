"use client";

import { useState, useTransition } from "react";

export default function DueDiligenceExtractionActions() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function runBatch() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/due-diligence/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "run_batch", limit: 25 }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data?.error ?? "Batch failed");
          return;
        }
        const r = data?.data ?? data;
        setMessage(
          `Processed ${r.processed ?? "?"} · updated ${r.updated ?? "?"} · new fields ${r.new_fields ?? "?"} · conflicts ${r.conflicts ?? "?"} · docs ${r.documents_found ?? "?"}`,
        );
      } catch {
        setMessage("Batch request failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={runBatch}
        className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-bold text-slate-900 disabled:opacity-50"
      >
        {pending ? "Running…" : "Re-run Due Diligence Extraction"}
      </button>
      {message ? (
        <p className="max-w-md text-right text-[11px] text-slate-300" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
