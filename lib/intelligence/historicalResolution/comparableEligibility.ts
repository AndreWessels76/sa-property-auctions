/**
 * Comparable eligibility with explicit rejection reasons (HI 4.2).
 */

import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import { compatiblePropertyTypes, minimumMatchingSignals } from "@/lib/intelligence/comparables/matching";
import { buildMatchingEvidenceList } from "@/lib/intelligence/comparables/scoring";
import { DEFAULT_COMPARABLE_CONFIG } from "@/lib/intelligence/comparables/config";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { ComparableRejectionReason } from "./types";
import type { HistoricalEventResolution } from "./types";

export function assessComparableEligibility(input: {
  subject: HistoricalEventObservation;
  candidate: HistoricalEventObservation;
  resolution: HistoricalEventResolution;
}): { eligible: boolean; reasons: ComparableRejectionReason[] } {
  const { subject, candidate, resolution } = input;
  const reasons: ComparableRejectionReason[] = [];

  if (subject.propertyMasterId && candidate.propertyMasterId === subject.propertyMasterId) {
    reasons.push("SAME_PROPERTY_MASTER");
  }
  if (resolution.state !== "VERIFIED" || resolution.outcome !== "SOLD") {
    reasons.push("OUTCOME_NOT_SOLD");
  }
  if (!isValidPositiveAmount(resolution.salePrice)) {
    reasons.push("SALE_PRICE_MISSING");
  }
  if (resolution.identityReviewRequired || !candidate.propertyMasterId) {
    reasons.push("IDENTITY_UNCERTAIN");
  }
  if (!candidate.town && !candidate.suburb && !candidate.province) {
    reasons.push("LOCATION_MISMATCH");
  }
  if (candidate.conflict || resolution.state === "CONFLICT") {
    reasons.push("CONFLICTING_EVIDENCE");
  }
  if (!candidate.verified) {
    reasons.push("UNVERIFIED_LISTING");
  }
  if (candidate.propertyTypeStatus !== "known" || !candidate.propertyType) {
    reasons.push("UNKNOWN_PROPERTY_TYPE");
  }

  const typeCompat = compatiblePropertyTypes(subject.propertyType, candidate.propertyType);
  if (!typeCompat.match && subject.propertyType && candidate.propertyType) {
    reasons.push("INCOMPATIBLE_PROPERTY_TYPE");
  }

  const { matching } = buildMatchingEvidenceList(subject, candidate, DEFAULT_COMPARABLE_CONFIG);
  if (matching.length < minimumMatchingSignals(subject)) {
    reasons.push("INSUFFICIENT_DATA");
  }

  const needsSize =
    isValidPositiveArea(subject.floorSizeM2) || isValidPositiveArea(subject.hectares);
  if (
    needsSize &&
    !isValidPositiveArea(candidate.floorSizeM2) &&
    !isValidPositiveArea(candidate.hectares)
  ) {
    reasons.push("SIZE_MISMATCH");
  }

  return { eligible: reasons.length === 0, reasons };
}

export function mapLegacyRejectionToCodes(legacy: string[]): ComparableRejectionReason[] {
  const codes: ComparableRejectionReason[] = [];
  for (const r of legacy) {
    if (r.includes("SOLD")) codes.push("OUTCOME_NOT_SOLD");
    else if (r.includes("sale price")) codes.push("SALE_PRICE_MISSING");
    else if (r.includes("Property Master")) codes.push("SAME_PROPERTY_MASTER");
    else if (r.includes("conflict") || r.includes("Conflict")) codes.push("CONFLICTING_EVIDENCE");
    else if (r.includes("identity") || r.includes("location")) codes.push("IDENTITY_UNCERTAIN");
    else if (r.includes("property type")) codes.push("UNKNOWN_PROPERTY_TYPE");
    else codes.push("INSUFFICIENT_DATA");
  }
  return [...new Set(codes)];
}
