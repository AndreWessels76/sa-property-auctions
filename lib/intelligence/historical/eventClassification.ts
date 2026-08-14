/**
 * Auction Event / listing state classification.
 * expired ≠ sold. completed ≠ sold. Unknown stays unknown.
 */

import { normalizeAuctionEventStatus } from "@/lib/identity/auctionEvent";
import { normalizeListingStatus } from "@/lib/data/propertyFoundation";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import type { HistoricalEventState } from "./types";

export function classifyAuctionEventState(
  status: string | null | undefined,
): HistoricalEventState {
  const s = normalizeAuctionEventStatus(status);
  if (s === "scheduled") return "upcoming";
  if (s === "live") return "live";
  if (s === "closed") return "completed";
  if (s === "sold") return "sold";
  if (s === "withdrawn") return "withdrawn";
  if (s === "cancelled") return "cancelled";
  if (s === "expired") return "expired";
  return "unknown";
}

/**
 * Listing fallback when no Auction Event exists.
 * Never infers sold from expired or completed.
 */
export function classifyListingHistoricalState(input: {
  listingStatus?: string | null;
  status?: string | null;
  verificationState?: string | null;
  auctionDate?: string | null;
  now?: Date;
}): HistoricalEventState {
  const listing = normalizeListingStatus(input.listingStatus ?? input.status);
  const verification = normalizeVerificationState(input.verificationState);

  if (listing === "sold" || verification === "sold") return "sold";
  if (listing === "cancelled") return "cancelled";
  if (listing === "withdrawn" || verification === "withdrawn") return "withdrawn";
  if (listing === "completed") return "completed";
  if (listing === "live") return "live";
  if (listing === "upcoming") {
    if (isPastAuctionDate(input.auctionDate, input.now)) return "expired";
    return "upcoming";
  }
  const rawStatus = (input.listingStatus ?? input.status ?? "").toLowerCase();
  if (verification === "expired" || rawStatus === "expired") return "expired";

  if (isPastAuctionDate(input.auctionDate, input.now)) return "expired";
  if (listing === "upcoming" || verification === "verified") return "upcoming";
  return "unknown";
}

export function isPastAuctionDate(
  auctionDate: string | null | undefined,
  now?: Date,
): boolean {
  if (!auctionDate?.trim()) return false;
  const d = new Date(auctionDate);
  if (Number.isNaN(d.getTime())) return false;
  const today = now ?? new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const startAuction = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  ).getTime();
  return startAuction < startToday;
}

export function isCurrentCatalogueState(state: HistoricalEventState): boolean {
  return state === "upcoming" || state === "live";
}

export function isHistoricalState(state: HistoricalEventState): boolean {
  return (
    state === "completed" ||
    state === "sold" ||
    state === "withdrawn" ||
    state === "cancelled" ||
    state === "expired" ||
    state === "unknown"
  );
}

/** Outcome is known only for explicit sold / withdrawn / cancelled. */
export function hasKnownOutcome(state: HistoricalEventState): boolean {
  return state === "sold" || state === "withdrawn" || state === "cancelled";
}

export function isCompletedLike(state: HistoricalEventState): boolean {
  return (
    state === "completed" ||
    state === "sold" ||
    state === "withdrawn" ||
    state === "cancelled" ||
    state === "expired"
  );
}
