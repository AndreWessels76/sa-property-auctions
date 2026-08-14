/**
 * Auction event reconstruction for backfill — conservative outcome rules.
 * expired ≠ sold. completed ≠ sold. Never infer sale from disappearance.
 */

import {
  normalizeAuctionEventStatus,
  type AuctionEventRecord,
  type AuctionEventStatus,
} from "@/lib/identity/auctionEvent";
import { normalizeListingStatus } from "@/lib/data/propertyFoundation";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import { isPastAuctionDate } from "@/lib/intelligence/historical/eventClassification";
import { computeEventFingerprint } from "./eventFingerprint";
import type { BackfillAuditStatus, BackfillEventAssessment } from "./types";

export type AuctionVenueKind = "ONLINE" | "PHYSICAL" | "HYBRID" | "UNKNOWN";

export function detectAuctionVenueKind(input: {
  venue?: string | null;
  auctionType?: string | null;
  title?: string | null;
  description?: string | null;
}): AuctionVenueKind {
  const hay = [
    input.venue,
    input.auctionType,
    input.title,
    input.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const online = /\bonline\b/.test(hay) || /\bvirtual\b/.test(hay);
  const physical =
    /\bvenue\b/.test(hay) ||
    /\bphysical\b/.test(hay) ||
    Boolean(input.venue?.trim() && !/\bonline\b/i.test(input.venue));

  if (online && physical) return "HYBRID";
  if (online) return "ONLINE";
  if (physical) return "PHYSICAL";
  return "UNKNOWN";
}

export function venueDisplayLabel(
  kind: AuctionVenueKind,
  venue: string | null | undefined,
): string | null {
  if (kind === "ONLINE") return "Online Auction";
  if (venue?.trim()) return venue.trim();
  if (kind === "PHYSICAL") return null;
  return null;
}

/**
 * Classify event status from listing evidence only — no lifecycle sold inference.
 */
export function classifyBackfillEventStatus(input: {
  listingStatus?: string | null;
  status?: string | null;
  verificationState?: string | null;
  auctionDate?: string | null;
  now?: Date;
}): AuctionEventStatus {
  const listing = normalizeListingStatus(input.listingStatus ?? input.status);
  const verification = normalizeVerificationState(input.verificationState);
  const normalized = normalizeAuctionEventStatus(listing ?? undefined);

  if (listing === "sold" || verification === "sold" || normalized === "sold") {
    return "sold";
  }
  if (
    listing === "withdrawn" ||
    verification === "withdrawn" ||
    normalized === "withdrawn"
  ) {
    return "withdrawn";
  }
  if (listing === "cancelled" || normalized === "cancelled") return "cancelled";
  if (listing === "live" || normalized === "live") return "live";
  if (listing === "upcoming" || normalized === "scheduled") {
    if (isPastAuctionDate(input.auctionDate, input.now)) return "expired";
    return "scheduled";
  }
  if (listing === "completed" || normalized === "closed") return "closed";
  const raw = (input.listingStatus ?? input.status ?? "").toLowerCase();
  if (verification === "expired" || raw === "expired" || normalized === "expired") {
    return "expired";
  }
  if (isPastAuctionDate(input.auctionDate, input.now)) return "expired";
  if (listing === "upcoming" || verification === "verified") return "scheduled";
  return "closed";
}

export function buildBackfillAuctionEvent(input: {
  propertyMasterId: string;
  listingPropertyId: string;
  externalListingId?: string | null;
  agency?: string | null;
  auctionDate?: string | null;
  auctionTime?: string | null;
  venue?: string | null;
  auctionType?: string | null;
  reservePrice?: number | null;
  listingStatus?: string | null;
  status?: string | null;
  verificationState?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  connectorId?: string | null;
  brochureLink?: string | null;
  termsLink?: string | null;
  catalogueLink?: string | null;
  verifiedAt?: string | null;
  title?: string | null;
  description?: string | null;
  now?: Date;
}): AuctionEventRecord {
  const venueKind = detectAuctionVenueKind({
    venue: input.venue,
    auctionType: input.auctionType,
    title: input.title,
    description: input.description,
  });
  const now = input.now ?? new Date();

  return {
    property_master_id: input.propertyMasterId,
    listing_property_id: input.listingPropertyId,
    external_listing_id: input.externalListingId ?? null,
    agency: input.agency ?? null,
    auction_date: input.auctionDate ?? null,
    auction_time: input.auctionTime ?? null,
    venue: venueDisplayLabel(venueKind, input.venue),
    auction_type: venueKind,
    reserve_price: input.reservePrice ?? null,
    opening_bid: null,
    winning_bid: null,
    guide_price: null,
    status: classifyBackfillEventStatus({
      listingStatus: input.listingStatus,
      status: input.status,
      verificationState: input.verificationState,
      auctionDate: input.auctionDate,
      now,
    }),
    source_name: input.sourceName ?? null,
    source_url: input.sourceUrl ?? null,
    connector_id: input.connectorId ?? null,
    verification_state: input.verificationState ?? null,
    brochure_link: input.brochureLink ?? null,
    terms_link: input.termsLink ?? null,
    catalogue_link: input.catalogueLink ?? null,
    documents: {
      brochure: Boolean(input.brochureLink),
      terms: Boolean(input.termsLink),
      catalogue: Boolean(input.catalogueLink),
      backfill: true,
    },
    imported_at: now.toISOString(),
    verified_at: input.verifiedAt ?? null,
  };
}

export function assessBackfillEvent(input: {
  propertyMasterId: string;
  listingPropertyId: string;
  externalListingId?: string | null;
  connectorId?: string | null;
  agency?: string | null;
  auctionDate?: string | null;
  sourceUrl?: string | null;
  existingEventId?: string | null;
  listingStatus?: string | null;
  status?: string | null;
  verificationState?: string | null;
  venue?: string | null;
  auctionType?: string | null;
  title?: string | null;
  description?: string | null;
  now?: Date;
}): BackfillEventAssessment {
  const eventFingerprint = computeEventFingerprint({
    propertyMasterId: input.propertyMasterId,
    auctionDate: input.auctionDate,
    connectorId: input.connectorId,
    externalEventId: input.externalListingId,
    agency: input.agency,
    sourceUrl: input.sourceUrl,
  });

  const status = classifyBackfillEventStatus({
    listingStatus: input.listingStatus,
    status: input.status,
    verificationState: input.verificationState,
    auctionDate: input.auctionDate,
    now: input.now,
  });

  const venueKind = detectAuctionVenueKind({
    venue: input.venue,
    auctionType: input.auctionType,
    title: input.title,
    description: input.description,
  });

  const notes: string[] = [];
  if (!input.auctionDate?.trim()) {
    notes.push("No auction date in source evidence.");
  }

  if (input.existingEventId) {
    return {
      canCreate: false,
      isDuplicate: true,
      existingEventId: input.existingEventId,
      eventFingerprint,
      status,
      auctionType: venueKind,
      venueLabel: venueDisplayLabel(venueKind, input.venue),
      dateKind: input.auctionDate?.trim() ? "auction_date" : "not_supplied",
      auditStatus: "DUPLICATE_EVENT",
      notes,
    };
  }

  let auditStatus: BackfillAuditStatus = "EVENT_CREATED";
  if (!input.auctionDate?.trim() && status === "closed") {
    auditStatus = "EVENT_REVIEW";
    notes.push("Event without auction date — review recommended.");
  }

  return {
    canCreate: true,
    isDuplicate: false,
    existingEventId: null,
    eventFingerprint,
    status,
    auctionType: venueKind,
    venueLabel: venueDisplayLabel(venueKind, input.venue),
    dateKind: input.auctionDate?.trim() ? "auction_date" : "not_supplied",
    auditStatus,
    notes,
  };
}
