/**
 * Comparable eligibility foundation — no AI similarity score.
 */

import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import type { ComparableCandidate, HistoricalEventObservation, HistoricalPriceKind } from "./types";

export function comparableEligibility(
  row: HistoricalEventObservation,
  preferredKind: HistoricalPriceKind = "sale_price",
): ComparableCandidate {
  const reasons: string[] = [];
  if (!row.verified) reasons.push("UNVERIFIED");
  if (row.conflict) reasons.push("CONFLICT");
  if (!row.town && !row.suburb && !row.province) {
    reasons.push("INSUFFICIENT_IDENTITY");
  }
  if (row.propertyTypeStatus !== "known") reasons.push("UNKNOWN_PROPERTY_TYPE");
  const price = row.prices[preferredKind];
  let priceKind: HistoricalPriceKind | null = preferredKind;
  if (!isValidPositiveAmount(price)) {
    reasons.push("MISSING_PRICE");
    priceKind = null;
  }
  const sizeOk =
    isValidPositiveArea(row.floorSizeM2) || isValidPositiveArea(row.hectares);
  if (!sizeOk) {
    reasons.push("INVALID_SIZE");
  }

  const eligible =
    !reasons.includes("UNVERIFIED") &&
    !reasons.includes("CONFLICT") &&
    !reasons.includes("INSUFFICIENT_IDENTITY") &&
    !reasons.includes("UNKNOWN_PROPERTY_TYPE") &&
    !reasons.includes("MISSING_PRICE");

  return {
    observationId: row.observationId,
    auctionEventId: row.auctionEventId,
    propertyMasterId: row.propertyMasterId,
    listingPropertyId: row.listingPropertyId,
    eligible,
    reasons,
    propertyType: row.propertyType,
    town: row.town,
    suburb: row.suburb,
    floorSizeM2: row.floorSizeM2,
    hectares: row.hectares,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    auctionDate: row.auctionDate,
    priceKind,
    price: priceKind ? row.prices[priceKind] : null,
  };
}

export function matchComparableDimensions(
  subject: HistoricalEventObservation,
  candidate: HistoricalEventObservation,
): { match: boolean; shared: string[] } {
  const shared: string[] = [];
  if (
    subject.propertyType &&
    candidate.propertyType &&
    subject.propertyType === candidate.propertyType &&
    subject.propertyTypeStatus === "known"
  ) {
    shared.push("property_type");
  }
  if (subject.town && candidate.town && subject.town === candidate.town) {
    shared.push("town");
  }
  if (subject.suburb && candidate.suburb && subject.suburb === candidate.suburb) {
    shared.push("suburb");
  }
  if (
    subject.agriculturalSubtype &&
    candidate.agriculturalSubtype &&
    subject.agriculturalSubtype === candidate.agriculturalSubtype
  ) {
    shared.push("agricultural_type");
  }
  return { match: shared.includes("property_type") && shared.includes("town"), shared };
}
