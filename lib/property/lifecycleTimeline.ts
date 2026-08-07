import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { suggestLifecycleFromDates } from "@/lib/data/listingLifecycle";
import { normalizeListingStatus } from "@/lib/data/propertyFoundation";
import {
  buildPropertyTimeline,
  type TimelineEvent,
} from "@/lib/property/propertyTimeline";

/**
 * Property Lifecycle Timeline 2.0 — deterministic stage markers.
 * Historical events retained; never invents sold outcomes.
 */

export type LifecycleStage =
  | "discovery"
  | "verification"
  | "images_added"
  | "documents_added"
  | "auction_published"
  | "auction_updated"
  | "registration_open"
  | "auction_live"
  | "sold"
  | "withdrawn"
  | "cancelled"
  | "archived";

export function buildLifecycleTimeline(input: {
  property: PropertyDTO;
  hasImages?: boolean;
  hasDocuments?: boolean;
  now?: Date;
}): TimelineEvent[] {
  const base = buildPropertyTimeline({ property: input.property });
  const p = input.property;
  const extra: TimelineEvent[] = [];

  if (p.imported_at) {
    extra.push({
      id: "discovery",
      at: p.imported_at,
      category: "lifecycle",
      title: "Discovery",
      detail: "Listing imported into acquisition pipeline",
    });
  }

  if (input.hasImages) {
    extra.push({
      id: "images_added",
      at: p.last_verified_at || p.imported_at || new Date().toISOString(),
      category: "lifecycle",
      title: "Images added",
      detail: "Gallery assets present",
    });
  }

  if (input.hasDocuments) {
    extra.push({
      id: "documents_added",
      at: p.last_verified_at || p.imported_at || new Date().toISOString(),
      category: "lifecycle",
      title: "Documents added",
      detail: "Brochure / terms / catalogue link present",
    });
  }

  if (p.verification_state === "verified" && p.auction_date) {
    extra.push({
      id: "auction_published",
      at: p.last_verified_at || p.imported_at || p.auction_date,
      category: "lifecycle",
      title: "Auction published",
      detail: "Verified listing eligible for public catalogue when upcoming/live",
    });
  }

  if (p.registration_link || p.deposit_requirements) {
    extra.push({
      id: "registration_open",
      at: p.imported_at || p.auction_date || new Date().toISOString(),
      category: "lifecycle",
      title: "Registration information available",
      detail: p.registration_link ? "Registration link present" : "Deposit requirements present",
    });
  }

  const lifecycle = suggestLifecycleFromDates({
    auctionDate: p.auction_date,
    currentStatus: p.listing_status ?? p.status,
    now: input.now,
  });
  if (lifecycle === "live") {
    extra.push({
      id: "auction_live",
      at: p.auction_date || new Date().toISOString(),
      category: "lifecycle",
      title: "Auction live",
      detail: "Derived from auction date window — not an invented outcome",
    });
  }

  const listing = normalizeListingStatus(p.listing_status ?? p.status);
  if (listing === "withdrawn" || p.verification_state === "withdrawn") {
    extra.push({
      id: "withdrawn",
      at: p.last_verified_at || p.imported_at || new Date().toISOString(),
      category: "lifecycle",
      title: "Withdrawn",
      detail: "Recorded withdrawn / cancelled path",
    });
  }
  if (listing === "cancelled") {
    extra.push({
      id: "cancelled",
      at: p.last_verified_at || p.imported_at || new Date().toISOString(),
      category: "lifecycle",
      title: "Cancelled",
      detail: "Recorded cancelled status",
    });
  }
  if (p.verification_state === "archived" || listing === "completed") {
    extra.push({
      id: "archived",
      at: p.last_verified_at || p.imported_at || new Date().toISOString(),
      category: "lifecycle",
      title: "Archived",
      detail: "Historical record retained for intelligence",
    });
  }

  // Dedupe by id preferring first occurrence
  const merged = [...base, ...extra];
  const seen = new Set<string>();
  const out: TimelineEvent[] = [];
  for (const e of merged.sort((a, b) => a.at.localeCompare(b.at))) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out;
}
