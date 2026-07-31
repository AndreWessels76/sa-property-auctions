"use client";

import { useState } from "react";

export default function ExportDataCard() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onExport() {
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sa-property-auctions-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-navy-900">Export my data</h2>
      <p className="mt-2 text-sm text-slate-600">
        Download a JSON copy of your profile, subscription metadata, alerts,
        saved searches, and watchlist (POPIA access request).
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => void onExport()}
        className="mt-4 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
      >
        {pending ? "Preparing…" : "Download data export"}
      </button>
    </div>
  );
}
