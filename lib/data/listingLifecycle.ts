import type { ListingLifecycleStatus } from "@/lib/data/verificationStates";
import {
  formatLifecycleLabel,
  normalizeLifecycleStatus,
} from "@/lib/data/verificationStates";

export type LifecycleTransition = {
  from: ListingLifecycleStatus | null;
  to: ListingLifecycleStatus;
  statusChangedAt: string;
  reason: string;
  sourceEvent: string;
  verificationDate?: string | null;
};

const ALLOWED: Record<ListingLifecycleStatus, ListingLifecycleStatus[]> = {
  upcoming: ["live", "withdrawn", "expired", "archived"],
  live: ["sold", "withdrawn", "expired", "archived"],
  sold: ["archived"],
  withdrawn: ["archived", "upcoming"],
  expired: ["archived", "upcoming"],
  archived: [],
};

export function canTransitionLifecycle(
  from: ListingLifecycleStatus | null,
  to: ListingLifecycleStatus,
): boolean {
  if (!from) return true;
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function buildLifecycleTransition(input: {
  currentStatus?: string | null;
  nextStatus: string;
  reason: string;
  sourceEvent: string;
  verificationDate?: string | null;
  now?: string;
}): LifecycleTransition | { error: string } {
  const from = normalizeLifecycleStatus(input.currentStatus);
  const to = normalizeLifecycleStatus(input.nextStatus);
  if (!to) {
    return { error: `Invalid lifecycle status: ${input.nextStatus}` };
  }
  if (!canTransitionLifecycle(from, to)) {
    return {
      error: `Cannot transition from ${formatLifecycleLabel(from)} to ${formatLifecycleLabel(to)}`,
    };
  }
  return {
    from,
    to,
    statusChangedAt: input.now ?? new Date().toISOString(),
    reason: input.reason,
    sourceEvent: input.sourceEvent,
    verificationDate: input.verificationDate ?? null,
  };
}

/**
 * Auto-suggest lifecycle from auction date vs now. Never fabricates sold outcomes.
 */
export function suggestLifecycleFromDates(input: {
  auctionDate?: string | null;
  currentStatus?: string | null;
  now?: Date;
}): ListingLifecycleStatus | null {
  const current = normalizeLifecycleStatus(input.currentStatus);
  if (current === "sold" || current === "withdrawn" || current === "archived") {
    return current;
  }
  if (!input.auctionDate) return current;
  const auction = new Date(input.auctionDate);
  if (Number.isNaN(auction.getTime())) return current;
  const now = input.now ?? new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  if (auction.getTime() > now.getTime()) return "upcoming";
  if (auction.getTime() + dayMs >= now.getTime()) return "live";
  // Past auction without explicit sold/withdrawn → expired (not sold — never invent).
  return "expired";
}
