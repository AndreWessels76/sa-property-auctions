/**
 * Build historical event observations from Auction Events + listings + pricing observations.
 * Prefer event records over mutable current listing fields.
 */

import type { AuctionEventRow, PropertyMaster } from "@/lib/identity";
import type { PricingObservationRow } from "@/lib/repositories/PricingObservationRepository";
import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import type { HistoricalEventObservation, HistoricalPriceFields, ExclusionReason } from "./types";
import {
  classifyAuctionEventState,
  classifyListingHistoricalState,
  isCurrentCatalogueState,
  isHistoricalState,
} from "./eventClassification";
import { resolveHistoricalPropertyType } from "./propertyTypes";

export type HistoricalListingInput = {
  id: string;
  title?: string | null;
  property_type?: string | null;
  listing_status?: string | null;
  status?: string | null;
  verification_state?: string | null;
  data_classification?: string | null;
  auction_date?: string | null;
  auction_price?: number | null;
  reserve_price?: number | null;
  estimated_value?: number | null;
  floor_size?: number | null;
  erf_size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  province?: string | null;
  town?: string | null;
  suburb?: string | null;
  municipality?: string | null;
  auction_agency?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  property_master_id?: string | null;
  farm_name?: string | null;
  agricultural_details?: { totalHectares?: number | null; farmCategory?: string | null } | null;
};

const TRUSTED_OBS = new Set(["verified", "source_confirmed", "extracted", "calculated"]);

function positive(n: number | null | undefined): number | null {
  return isValidPositiveAmount(n) ? n : null;
}

function pickObservation(
  rows: PricingObservationRow[],
  field: string,
): PricingObservationRow | null {
  const candidates = rows.filter(
    (o) =>
      o.field_name === field &&
      TRUSTED_OBS.has(o.status) &&
      o.status !== "conflict" &&
      !o.is_range &&
      positive(o.normalized_value) != null,
  );
  const rank = (s: string) =>
    s === "verified" ? 3 : s === "source_confirmed" ? 2 : 1;
  candidates.sort((a, b) => rank(b.status) - rank(a.status));
  return candidates[0] ?? null;
}

function hasConflict(rows: PricingObservationRow[], field: string): boolean {
  return rows.some((o) => o.field_name === field && o.status === "conflict");
}

function isTrustedVerification(state: string | null | undefined): boolean {
  const v = (state ?? "").toLowerCase();
  return (
    v === "verified" ||
    v === "sold" ||
    v === "expired" ||
    v === "withdrawn"
  );
}

function pricesFrom(
  event: AuctionEventRow | null,
  listing: HistoricalListingInput | null,
  obs: PricingObservationRow[],
): HistoricalPriceFields {
  const saleObs = pickObservation(obs, "sale_price");
  const auctionObs = pickObservation(obs, "auction_price");
  const guideObs = pickObservation(obs, "guide_price");
  const reserveObs = pickObservation(obs, "reserve_price");
  const estimateObs = pickObservation(obs, "estimated_value");
  const startObs = pickObservation(obs, "starting_bid");

  const sold =
    event != null && classifyAuctionEventState(event.status) === "sold";

  return {
    sale_price:
      positive(saleObs?.normalized_value) ??
      (sold ? positive(event?.winning_bid) : null),
    auction_price:
      positive(auctionObs?.normalized_value) ??
      positive(listing?.auction_price) ??
      null,
    guide_price:
      positive(guideObs?.normalized_value) ??
      positive(event?.guide_price) ??
      null,
    reserve_price:
      positive(reserveObs?.normalized_value) ??
      positive(event?.reserve_price) ??
      positive(listing?.reserve_price) ??
      null,
    estimated_value:
      positive(estimateObs?.normalized_value) ??
      positive(listing?.estimated_value) ??
      null,
    starting_bid:
      positive(startObs?.normalized_value) ??
      positive(event?.opening_bid) ??
      null,
  };
}

function observationsFor(input: {
  all: PricingObservationRow[];
  listingId: string | null;
  eventId: string | null;
  masterId: string | null;
}): PricingObservationRow[] {
  return input.all.filter((o) => {
    if (input.eventId && o.auction_event_id === input.eventId) return true;
    if (input.listingId && o.property_id === input.listingId) return true;
    if (
      input.masterId &&
      o.property_master_id === input.masterId &&
      !o.auction_event_id &&
      !o.property_id
    ) {
      return true;
    }
    return false;
  });
}

export function buildHistoricalDataset(input: {
  events: AuctionEventRow[];
  listings: HistoricalListingInput[];
  masters?: PropertyMaster[];
  observations?: PricingObservationRow[];
  now?: Date;
}): HistoricalEventObservation[] {
  const now = input.now ?? new Date();
  const listingsById = new Map(input.listings.map((l) => [l.id, l]));
  const mastersById = new Map((input.masters ?? []).map((m) => [m.id, m]));
  const observations = input.observations ?? [];
  const coveredListingIds = new Set<string>();
  const seenKeys = new Set<string>();
  const out: HistoricalEventObservation[] = [];

  for (const event of input.events) {
    const listing = event.listing_property_id
      ? listingsById.get(event.listing_property_id) ?? null
      : null;
    const master = event.property_master_id
      ? mastersById.get(event.property_master_id) ?? null
      : null;
    const obs = observationsFor({
      all: observations,
      listingId: event.listing_property_id,
      eventId: event.id,
      masterId: event.property_master_id,
    });

    const state = classifyAuctionEventState(event.status);
    const typeInfo = resolveHistoricalPropertyType({
      propertyType: listing?.property_type ?? master?.property_type,
      title: listing?.title ?? master?.title,
    });
    const floorObs = pickObservation(obs, "floor_size_m2");
    const haObs = pickObservation(obs, "total_hectares");
    const floor =
      positive(floorObs?.normalized_value) ??
      (isValidPositiveArea(listing?.floor_size) ? listing!.floor_size! : null);
    const ha =
      positive(haObs?.normalized_value) ??
      (isValidPositiveArea(listing?.agricultural_details?.totalHectares)
        ? listing!.agricultural_details!.totalHectares!
        : null);

    const dedupeKey = `event:${event.id}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);
    if (event.listing_property_id) coveredListingIds.add(event.listing_property_id);

    const verified = isTrustedVerification(
      event.verification_state ?? listing?.verification_state ?? master?.verification_state,
    );
    const conflict =
      hasConflict(obs, "sale_price") ||
      hasConflict(obs, "auction_price") ||
      hasConflict(obs, "guide_price");

    const reasons: ExclusionReason[] = [];
    if (isCurrentCatalogueState(state)) reasons.push("NOT_HISTORICAL");
    if (!verified) reasons.push("UNVERIFIED");
    if (conflict) reasons.push("CONFLICT");
    if (!event.property_master_id && !event.listing_property_id) {
      reasons.push("INSUFFICIENT_IDENTITY");
    }
    if (typeInfo.status === "needs_verification") {
      reasons.push("UNKNOWN_PROPERTY_TYPE");
    }
    if (listing?.data_classification === "seed" || listing?.data_classification === "demo") {
      reasons.push("UNVERIFIED");
    }

    out.push({
      observationId: dedupeKey,
      sourceUnit: "auction_event",
      auctionEventId: event.id,
      propertyMasterId: event.property_master_id,
      listingPropertyId: event.listing_property_id,
      state,
      outcomeSupplied: state === "sold" || state === "withdrawn" || state === "cancelled",
      auctionDate: event.auction_date ?? listing?.auction_date ?? null,
      dateKind: event.auction_date ? "auction_date" : "not_supplied",
      agency: event.agency ?? listing?.auction_agency ?? listing?.source_name ?? null,
      sourceName: event.source_name ?? listing?.source_name ?? null,
      sourceUrl: event.source_url ?? listing?.source_url ?? null,
      verificationState:
        event.verification_state ?? listing?.verification_state ?? null,
      verified,
      conflict,
      propertyType: typeInfo.propertyType,
      propertyTypeStatus: typeInfo.status,
      marketCategory: typeInfo.marketCategory,
      agriculturalSubtype: typeInfo.agriculturalSubtype,
      province: listing?.province ?? master?.province ?? null,
      municipality: listing?.municipality ?? master?.municipality ?? null,
      town: listing?.town ?? master?.town ?? null,
      suburb: listing?.suburb ?? master?.suburb ?? null,
      farmName: listing?.farm_name ?? master?.farm_name ?? null,
      floorSizeM2: floor,
      hectares: ha,
      hectaresApproximate: Boolean(haObs?.is_approximate),
      bedrooms: listing?.bedrooms ?? null,
      bathrooms: listing?.bathrooms ?? null,
      prices: pricesFrom(event, listing, obs),
      exclusionReasons: reasons,
    });
  }

  for (const listing of input.listings) {
    if (coveredListingIds.has(listing.id)) continue;
    if (listing.data_classification === "seed" || listing.data_classification === "demo") {
      continue;
    }
    const state = classifyListingHistoricalState({
      listingStatus: listing.listing_status,
      status: listing.status,
      verificationState: listing.verification_state,
      auctionDate: listing.auction_date,
      now,
    });
    const obs = observationsFor({
      all: observations,
      listingId: listing.id,
      eventId: null,
      masterId: listing.property_master_id ?? null,
    });
    const typeInfo = resolveHistoricalPropertyType({
      propertyType: listing.property_type,
      title: listing.title,
    });
    const floorObs = pickObservation(obs, "floor_size_m2");
    const haObs = pickObservation(obs, "total_hectares");
    const dedupeKey = listing.property_master_id
      ? `listing:${listing.property_master_id}:${listing.auction_date ?? listing.id}`
      : `listing:${listing.id}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const verified = isTrustedVerification(listing.verification_state);
    const conflict =
      hasConflict(obs, "sale_price") || hasConflict(obs, "auction_price");
    const reasons: ExclusionReason[] = [];
    if (isCurrentCatalogueState(state)) reasons.push("NOT_HISTORICAL");
    if (!isHistoricalState(state) && !isCurrentCatalogueState(state)) {
      reasons.push("NOT_HISTORICAL");
    }
    if (!verified) reasons.push("UNVERIFIED");
    if (conflict) reasons.push("CONFLICT");
    if (typeInfo.status === "needs_verification") reasons.push("UNKNOWN_PROPERTY_TYPE");

    out.push({
      observationId: dedupeKey,
      sourceUnit: "listing_fallback",
      auctionEventId: null,
      propertyMasterId: listing.property_master_id ?? null,
      listingPropertyId: listing.id,
      state,
      outcomeSupplied: state === "sold" || state === "withdrawn" || state === "cancelled",
      auctionDate: listing.auction_date ?? null,
      dateKind: listing.auction_date ? "auction_date" : "not_supplied",
      agency: listing.auction_agency ?? listing.source_name ?? null,
      sourceName: listing.source_name ?? null,
      sourceUrl: listing.source_url ?? null,
      verificationState: listing.verification_state ?? null,
      verified,
      conflict,
      propertyType: typeInfo.propertyType,
      propertyTypeStatus: typeInfo.status,
      marketCategory: typeInfo.marketCategory,
      agriculturalSubtype: typeInfo.agriculturalSubtype,
      province: listing.province ?? null,
      municipality: listing.municipality ?? null,
      town: listing.town ?? null,
      suburb: listing.suburb ?? null,
      farmName: listing.farm_name ?? null,
      floorSizeM2:
        positive(floorObs?.normalized_value) ??
        (isValidPositiveArea(listing.floor_size) ? listing.floor_size : null),
      hectares:
        positive(haObs?.normalized_value) ??
        (isValidPositiveArea(listing.agricultural_details?.totalHectares)
          ? listing.agricultural_details!.totalHectares!
          : null),
      hectaresApproximate: Boolean(haObs?.is_approximate),
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      prices: pricesFrom(null, listing, obs),
      exclusionReasons: reasons,
    });
  }

  return out;
}

export function publicHistoricalRows(
  rows: HistoricalEventObservation[],
): HistoricalEventObservation[] {
  return rows.filter(
    (r) =>
      r.verified &&
      !r.conflict &&
      isHistoricalState(r.state) &&
      !r.exclusionReasons.includes("UNVERIFIED") &&
      !r.exclusionReasons.includes("CONFLICT") &&
      !r.exclusionReasons.includes("NOT_HISTORICAL") &&
      !r.exclusionReasons.includes("DUPLICATE_EVENT") &&
      !r.exclusionReasons.includes("INSUFFICIENT_IDENTITY"),
  );
}
