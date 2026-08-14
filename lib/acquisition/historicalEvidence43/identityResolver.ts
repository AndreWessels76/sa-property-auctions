/**
 * Identity scoring for historical evidence attachment (HEA 4.3).
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import { assessIdentityConfidence } from "@/lib/intelligence/historicalResolution/identityResolver";

export type IdentityMatchStrength = "strong" | "medium" | "weak";

export function assessIdentityMatchStrength(
  event: HistoricalEventObservation,
  input?: {
    externalListingId?: string | null;
    partnerReference?: string | null;
    exactAddress?: string | null;
  },
): { strength: IdentityMatchStrength; reviewRequired: boolean; reason: string } {
  const base = assessIdentityConfidence(event);

  if (input?.externalListingId || input?.partnerReference) {
    return {
      strength: "strong",
      reviewRequired: false,
      reason: "Partner/source listing reference present",
    };
  }

  if (event.propertyMasterId && event.auctionEventId && event.verified) {
    return { strength: "strong", reviewRequired: false, reason: base.reason };
  }

  if (base.reviewRequired) {
    return { strength: "weak", reviewRequired: true, reason: base.reason };
  }

  if (base.level === "HIGH" || base.level === "MEDIUM") {
    return { strength: "medium", reviewRequired: false, reason: base.reason };
  }

  return { strength: "weak", reviewRequired: true, reason: base.reason };
}

export function identityReviewRequired(strength: IdentityMatchStrength): boolean {
  return strength === "weak";
}
