/**
 * Identity verification for historical evidence attachment (HI 4.2).
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { EvidenceConfidenceLevel } from "@/lib/intelligence/historicalEvidence/config";

export function assessIdentityConfidence(
  row: HistoricalEventObservation,
): { level: EvidenceConfidenceLevel; reviewRequired: boolean; reason: string } {
  let score = 0;

  if (row.propertyMasterId) score += 3;
  if (row.auctionEventId) score += 3;
  if (row.verified && !row.conflict) score += 1;
  if (row.propertyTypeStatus === "known" && row.propertyType) score += 1;
  if (row.suburb?.trim() || row.farmName?.trim()) score += 1;
  if (row.town?.trim()) score += 1;

  // Town + agency alone is insufficient — require master or event link
  const townAgencyOnly =
    !row.propertyMasterId &&
    !row.auctionEventId &&
    Boolean(row.town) &&
    Boolean(row.agency ?? row.sourceName);

  if (townAgencyOnly) {
    return {
      level: "INSUFFICIENT",
      reviewRequired: true,
      reason: "IDENTITY_REVIEW_REQUIRED — town/agency match alone is insufficient",
    };
  }

  if (score >= 6) {
    return { level: "HIGH", reviewRequired: false, reason: "Property Master and Auction Event linked" };
  }
  if (score >= 4) {
    return { level: "MEDIUM", reviewRequired: false, reason: "Partial identity linkage" };
  }
  if (score >= 2) {
    return { level: "LOW", reviewRequired: true, reason: "Weak identity linkage — review recommended" };
  }

  return {
    level: "INSUFFICIENT",
    reviewRequired: true,
    reason: "IDENTITY_REVIEW_REQUIRED — insufficient identity signals",
  };
}
