"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  clearCompareIds,
  getCompareIds,
  onCompareIdsChange,
} from "@/lib/compare/compareSelection";

export default function CompareBar() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(getCompareIds());
    sync();
    return onCompareIdsChange(sync);
  }, []);

  if (ids.length === 0) return null;

  const href = `/compare?ids=${encodeURIComponent(ids.join(","))}`;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(960px,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl border border-navy-900 bg-navy-900 px-4 py-3 text-white shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          Compare {ids.length} listing{ids.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => clearCompareIds()}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            Clear
          </button>
          <Link
            href={href}
            className="rounded-lg bg-gold-500 px-4 py-2 text-xs font-bold text-navy-950"
          >
            Open comparison
          </Link>
        </div>
      </div>
    </div>
  );
}
