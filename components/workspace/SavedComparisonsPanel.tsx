"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCompareIds } from "@/lib/compare/compareSelection";

type SavedComparison = { name: string; ids: string[]; savedAt: string };

const KEY = "sa_saved_comparisons";

function load(): SavedComparison[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedComparison[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export default function SavedComparisonsPanel() {
  const [rows, setRows] = useState<SavedComparison[]>([]);

  useEffect(() => {
    setRows(load());
  }, []);

  function saveCurrent() {
    const ids = getCompareIds();
    if (!ids.length) return;
    const next: SavedComparison[] = [
      {
        name: `Comparison (${ids.length})`,
        ids,
        savedAt: new Date().toISOString(),
      },
      ...load().filter((r) => r.ids.join(",") !== ids.join(",")),
    ].slice(0, 20);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    setRows(next);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-navy-900">Saved comparisons</h2>
      <p className="mt-1 text-xs text-slate-500">
        Stored on this device. Server-side comparison history is not available
        yet.
      </p>
      <button
        type="button"
        onClick={saveCurrent}
        className="mt-3 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white"
      >
        Save current compare tray
      </button>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No saved comparisons yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={`${row.savedAt}-${row.ids.join(",")}`}>
              <Link
                href={`/compare?ids=${encodeURIComponent(row.ids.join(","))}`}
                className="text-sm font-medium text-navy-900 underline"
              >
                {row.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
