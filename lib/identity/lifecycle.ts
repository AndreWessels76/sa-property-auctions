/**
 * Property Lifecycle Engine — append-only state progression.
 * Never deletes historical states (history recorded separately).
 */

export type PropertyLifecycleState =
  | "discovered"
  | "imported"
  | "pending_verification"
  | "verified"
  | "auction_scheduled"
  | "auction_live"
  | "auction_closed"
  | "sold"
  | "archived"
  | "relisted";

export const PROPERTY_LIFECYCLE_LABELS: Record<PropertyLifecycleState, string> = {
  discovered: "Discovered",
  imported: "Imported",
  pending_verification: "Pending Verification",
  verified: "Verified",
  auction_scheduled: "Auction Scheduled",
  auction_live: "Auction Live",
  auction_closed: "Auction Closed",
  sold: "Sold",
  archived: "Archived",
  relisted: "Re-listed",
};

const ALLOWED: Record<PropertyLifecycleState, PropertyLifecycleState[]> = {
  discovered: ["imported", "pending_verification", "archived"],
  imported: ["pending_verification", "archived"],
  pending_verification: ["verified", "archived", "imported"],
  verified: ["auction_scheduled", "auction_live", "archived", "relisted"],
  auction_scheduled: ["auction_live", "auction_closed", "archived", "relisted"],
  auction_live: ["auction_closed", "sold", "archived"],
  auction_closed: ["sold", "archived", "relisted"],
  sold: ["archived", "relisted"],
  archived: ["relisted"],
  relisted: ["pending_verification", "verified", "auction_scheduled"],
};

export function normalizePropertyLifecycle(
  value: string | null | undefined,
): PropertyLifecycleState | null {
  if (!value) return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (v in PROPERTY_LIFECYCLE_LABELS) return v as PropertyLifecycleState;
  // Map listing/verification vocabulary
  if (v === "upcoming") return "auction_scheduled";
  if (v === "live" || v === "active") return "auction_live";
  if (v === "completed" || v === "closed" || v === "expired") return "auction_closed";
  if (v === "withdrawn" || v === "cancelled" || v === "canceled") return "archived";
  if (v === "seed") return "discovered";
  return null;
}

export function canTransitionPropertyLifecycle(
  from: PropertyLifecycleState | null,
  to: PropertyLifecycleState,
): boolean {
  if (!from) return true;
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function suggestPropertyLifecycle(input: {
  verificationState?: string | null;
  listingStatus?: string | null;
  auctionDate?: string | null;
  hasMaster?: boolean;
  now?: Date;
}): PropertyLifecycleState {
  const now = input.now ?? new Date();
  const verification = (input.verificationState ?? "").toLowerCase();
  const listing = (input.listingStatus ?? "").toLowerCase();

  if (listing === "sold" || verification === "sold") return "sold";
  if (
    listing === "withdrawn" ||
    listing === "cancelled" ||
    verification === "withdrawn" ||
    verification === "archived"
  ) {
    return "archived";
  }

  if (verification === "pending_verification" || verification === "seed") {
    return verification === "seed" ? "discovered" : "pending_verification";
  }

  if (verification === "verified" || verification === "expired") {
    if (!input.auctionDate) return "verified";
    const auction = new Date(input.auctionDate);
    if (Number.isNaN(auction.getTime())) return "verified";
    const dayMs = 24 * 60 * 60 * 1000;
    if (auction.getTime() > now.getTime()) return "auction_scheduled";
    if (auction.getTime() + dayMs >= now.getTime()) return "auction_live";
    if (verification === "expired" || listing === "completed" || listing === "expired") {
      return "auction_closed";
    }
    return "auction_closed";
  }

  if (!input.hasMaster) return "discovered";
  return "imported";
}

export type LifecycleTransitionResult =
  | {
      ok: true;
      from: PropertyLifecycleState | null;
      to: PropertyLifecycleState;
      at: string;
      reason: string;
    }
  | { ok: false; error: string };

export function buildPropertyLifecycleTransition(input: {
  current?: string | null;
  next: string;
  reason: string;
  now?: string;
}): LifecycleTransitionResult {
  const from = normalizePropertyLifecycle(input.current);
  const to = normalizePropertyLifecycle(input.next);
  if (!to) return { ok: false, error: `Invalid lifecycle state: ${input.next}` };
  if (!canTransitionPropertyLifecycle(from, to)) {
    return {
      ok: false,
      error: `Cannot transition from ${from ?? "null"} to ${to}`,
    };
  }
  return {
    ok: true,
    from,
    to,
    at: input.now ?? new Date().toISOString(),
    reason: input.reason,
  };
}
