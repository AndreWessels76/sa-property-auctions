import { suggestPropertyLifecycle } from "@/lib/identity/lifecycle";

/**
 * Auction Event Engine — child records of a Property Master.
 */

export type AuctionEventStatus =
  | "scheduled"
  | "live"
  | "closed"
  | "sold"
  | "withdrawn"
  | "cancelled"
  | "expired";

export type AuctionEventRecord = {
  id?: string;
  property_master_id: string;
  listing_property_id?: string | null;
  external_listing_id?: string | null;
  agency?: string | null;
  auction_date?: string | null;
  auction_time?: string | null;
  venue?: string | null;
  auction_type?: string | null;
  reserve_price?: number | null;
  opening_bid?: number | null;
  winning_bid?: number | null;
  guide_price?: number | null;
  status: AuctionEventStatus;
  source_name?: string | null;
  source_url?: string | null;
  connector_id?: string | null;
  verification_state?: string | null;
  brochure_link?: string | null;
  terms_link?: string | null;
  catalogue_link?: string | null;
  documents?: Record<string, unknown> | null;
  imported_at?: string;
  verified_at?: string | null;
};

export function normalizeAuctionEventStatus(
  value: string | null | undefined,
): AuctionEventStatus | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "scheduled" || v === "upcoming") return "scheduled";
  if (v === "live" || v === "active") return "live";
  if (v === "closed" || v === "completed" || v === "auction_closed") return "closed";
  if (v === "sold") return "sold";
  if (v === "withdrawn") return "withdrawn";
  if (v === "cancelled" || v === "canceled") return "cancelled";
  if (v === "expired") return "expired";
  return null;
}

export function suggestAuctionEventStatus(input: {
  listingStatus?: string | null;
  verificationState?: string | null;
  auctionDate?: string | null;
  now?: Date;
}): AuctionEventStatus {
  const listing = normalizeAuctionEventStatus(input.listingStatus);
  if (listing === "sold") return "sold";
  if (listing === "withdrawn") return "withdrawn";
  if (listing === "cancelled") return "cancelled";
  if (listing === "live") return "live";
  if (listing === "scheduled") return "scheduled";

  const lifecycle = suggestPropertyLifecycle({
    verificationState: input.verificationState,
    listingStatus: input.listingStatus,
    auctionDate: input.auctionDate,
    hasMaster: true,
    now: input.now,
  });

  if (lifecycle === "sold") return "sold";
  if (lifecycle === "archived") return "withdrawn";
  if (lifecycle === "auction_live") return "live";
  if (lifecycle === "auction_scheduled") return "scheduled";
  if (lifecycle === "auction_closed") return "closed";
  return "scheduled";
}

export function buildAuctionEventFromListing(input: {
  propertyMasterId: string;
  listingPropertyId: string;
  externalListingId?: string | null;
  agency?: string | null;
  auctionDate?: string | null;
  auctionTime?: string | null;
  venue?: string | null;
  auctionType?: string | null;
  reservePrice?: number | null;
  guidePrice?: number | null;
  listingStatus?: string | null;
  verificationState?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  connectorId?: string | null;
  brochureLink?: string | null;
  termsLink?: string | null;
  catalogueLink?: string | null;
  verifiedAt?: string | null;
  now?: Date;
}): AuctionEventRecord {
  const now = input.now ?? new Date();
  return {
    property_master_id: input.propertyMasterId,
    listing_property_id: input.listingPropertyId,
    external_listing_id: input.externalListingId ?? null,
    agency: input.agency ?? null,
    auction_date: input.auctionDate ?? null,
    auction_time: input.auctionTime ?? null,
    venue: input.venue ?? null,
    auction_type: input.auctionType ?? null,
    reserve_price: input.reservePrice ?? null,
    opening_bid: null,
    winning_bid: null,
    guide_price: input.guidePrice ?? null,
    status: suggestAuctionEventStatus({
      listingStatus: input.listingStatus,
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
    },
    imported_at: now.toISOString(),
    verified_at: input.verifiedAt ?? null,
  };
}

/** Public catalogue may only surface scheduled + live events. */
export function isPublicAuctionEventStatus(status: string | null | undefined): boolean {
  const s = normalizeAuctionEventStatus(status);
  return s === "scheduled" || s === "live";
}
