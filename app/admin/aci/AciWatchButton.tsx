"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aci-operator-watchlist";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, 50)));
  window.dispatchEvent(new Event("aci-watchlist-updated"));
}

export function useAciWatchlist() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const load = () => setIds(readIds());
    load();
    window.addEventListener("aci-watchlist-updated", load);
    return () => window.removeEventListener("aci-watchlist-updated", load);
  }, []);
  function toggle(id: string) {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    writeIds(next);
    setIds(next);
  }
  return { ids, toggle, watching: (id: string) => ids.includes(id) };
}

export default function AciWatchButton({ id }: { id: string }) {
  const { toggle, watching } = useAciWatchlist();
  const on = watching(id);
  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50"
    >
      {on ? "WATCHING" : "WATCH"}
    </button>
  );
}
