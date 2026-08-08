import type { FetchPolicy } from "./types";
import { DEFAULT_FETCH_POLICY } from "./types";

export function resolveFetchPolicy(
  overrides?: Partial<FetchPolicy>,
): FetchPolicy {
  return { ...DEFAULT_FETCH_POLICY, ...overrides };
}

export function hostAllowed(url: string, policy: FetchPolicy): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return policy.allowedHosts.some(
      (h) => host === h.toLowerCase() || host.endsWith(`.${h.toLowerCase()}`),
    );
  } catch {
    return false;
  }
}

export function contentTypeAllowed(
  contentType: string | null,
  policy: FetchPolicy,
): boolean {
  if (!contentType) return false;
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return policy.allowedContentTypes.some((t) => base === t.toLowerCase());
}

/** Priority score — higher = fetch sooner. */
export function refetchPriority(input: {
  listingStatus?: string | null;
  auctionDate?: string | null;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const status = (input.listingStatus ?? "").toLowerCase();
  if (status === "live") return 1000;
  if (!input.auctionDate) return 10;
  const d = new Date(input.auctionDate);
  if (Number.isNaN(d.getTime())) return 10;
  const days = Math.round(
    (d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days < 0) return 5; // historical — low priority
  if (days <= 1) return 900;
  if (days <= 7) return 700;
  if (days <= 30) return 400;
  return 100;
}

export function intervalForPriority(priority: number): number {
  if (priority >= 900) return 6 * 60 * 60 * 1000; // 6h
  if (priority >= 400) return 24 * 60 * 60 * 1000; // daily
  return 7 * 24 * 60 * 60 * 1000; // weekly historical
}
