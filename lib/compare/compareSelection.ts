const STORAGE_KEY = "sa_compare_ids";
const EVENT = "compareIdsUpdated";

export function parseCompareIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 6) break;
  }
  return out;
}

export function getCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return parseCompareIds(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function setCompareIds(ids: string[]): string[] {
  const unique = parseCompareIds(ids.join(","));
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, unique.join(","));
    window.dispatchEvent(new Event(EVENT));
  }
  return unique;
}

export function toggleCompareId(id: string): string[] {
  const current = getCompareIds();
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id].slice(0, 6);
  return setCompareIds(next);
}

export function clearCompareIds(): void {
  setCompareIds([]);
}

export function onCompareIdsChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
