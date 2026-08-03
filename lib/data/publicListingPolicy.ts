/**
 * Public catalogue policy — Verified Data Platform 2.0
 *
 * Public surfaces show only Upcoming + Live verified auctions.
 * Historical rows (sold / expired / withdrawn / cancelled / completed)
 * remain in the database for intelligence — never in the public catalogue.
 */
import { normalizeListingStatus } from "@/lib/data/propertyFoundation";
import { suggestLifecycleFromDates } from "@/lib/data/listingLifecycle";
import {
  normalizeVerificationState,
  type VerificationState,
} from "@/lib/data/verificationStates";

/** Verification states allowed on public catalogue / public detail. */
export const PUBLIC_VERIFICATION_STATES: VerificationState[] = ["verified"];

/** Listing statuses allowed on public catalogue. */
export const PUBLIC_LISTING_STATUSES = ["upcoming", "live"] as const;

/** Verification states usable for historical intelligence (never public catalogue). */
export const HISTORICAL_INTELLIGENCE_STATES: VerificationState[] = [
  "verified",
  "sold",
  "expired",
  "withdrawn",
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function publicCatalogueTodayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Gate used by getPublic* and favourites — verification + classification only.
 * Prefer {@link isPubliclyActiveListing} for catalogue activity rules.
 */
export function isPubliclyVisibleVerification(
  verificationState: string | null | undefined,
  dataClassification?: string | null,
): boolean {
  const state = normalizeVerificationState(verificationState);
  if (!state) {
    return false;
  }
  if (
    state === "seed" ||
    state === "pending_verification" ||
    state === "archived" ||
    state === "sold" ||
    state === "expired" ||
    state === "withdrawn"
  ) {
    return false;
  }
  if (dataClassification === "seed" || dataClassification === "demo") {
    return false;
  }
  return PUBLIC_VERIFICATION_STATES.includes(state);
}

/**
 * Full public catalogue gate: verified + upcoming/live only.
 * Past auction dates (without live) are treated as historical — hidden.
 */
export function isPubliclyActiveListing(input: {
  verification_state?: string | null;
  data_classification?: string | null;
  listing_status?: string | null;
  status?: string | null;
  auction_date?: string | null;
  now?: Date;
}): boolean {
  if (
    !isPubliclyVisibleVerification(
      input.verification_state,
      input.data_classification,
    )
  ) {
    return false;
  }

  const listingStatus = normalizeListingStatus(
    input.listing_status ?? input.status,
  );
  if (
    listingStatus === "sold" ||
    listingStatus === "withdrawn" ||
    listingStatus === "cancelled" ||
    listingStatus === "completed"
  ) {
    return false;
  }

  const lifecycle = suggestLifecycleFromDates({
    auctionDate: input.auction_date,
    currentStatus: listingStatus ?? input.status,
    now: input.now,
  });

  if (lifecycle === "live" || listingStatus === "live") {
    return true;
  }
  if (lifecycle === "upcoming" || listingStatus === "upcoming") {
    return true;
  }

  // No reliable status: allow only if auction day is today or future.
  if (input.auction_date?.trim()) {
    const auction = new Date(input.auction_date);
    if (!Number.isNaN(auction.getTime())) {
      return startOfDay(auction).getTime() >= startOfDay(input.now ?? new Date()).getTime();
    }
  }

  return false;
}

export function publicVerificationFilter(): string {
  return PUBLIC_VERIFICATION_STATES.join(",");
}
