import type { Property } from "@/lib/types/property";
import {
  resolveVerificationStateFromRow,
} from "@/lib/data/multiQualityScore";
import { verifyAddressFields } from "@/lib/data/addressVerification";

/**
 * AI readiness — expose clean verified shapes only.
 * No AI redesign; consumers must filter to verified-ready rows.
 */

export type AiReadyPropertySlice = {
  propertyId: string;
  verificationState: string;
  aiReady: boolean;
  reasonsBlocked: string[];
  supports: {
    comparableSales: boolean;
    priceAnalytics: boolean;
    investmentScore: boolean;
    marketTrends: boolean;
    radiusSearch: boolean;
    heatMaps: boolean;
    neighbourhoodInsights: boolean;
  };
};

export function toAiReadySlice(property: Property): AiReadyPropertySlice {
  const state = resolveVerificationStateFromRow(property);
  const address = verifyAddressFields({
    street: property.street_address,
    address: property.address,
    suburb: property.suburb,
    town: property.town,
    province: property.province,
    postalCode: property.postal_code,
    latitude: property.latitude,
    longitude: property.longitude,
  });

  const reasonsBlocked: string[] = [];
  if (state === "seed") reasonsBlocked.push("Seed data not AI-ready");
  if (state === "pending_verification") {
    reasonsBlocked.push("Pending verification");
  }
  if (state !== "verified" && state !== "sold" && state !== "expired") {
    if (!reasonsBlocked.length) {
      reasonsBlocked.push(`Verification state: ${state}`);
    }
  }
  if (!address.town || !address.province) {
    reasonsBlocked.push("Insufficient location for geo/AI features");
  }

  const verifiedLike = state === "verified" || state === "sold";
  const hasCoords = Boolean(address.coordinates);
  const aiReady = verifiedLike && reasonsBlocked.length === 0;

  return {
    propertyId: property.id,
    verificationState: state,
    aiReady,
    reasonsBlocked,
    supports: {
      comparableSales: verifiedLike && Boolean(property.auction_price),
      priceAnalytics: verifiedLike,
      investmentScore: verifiedLike,
      marketTrends: verifiedLike,
      radiusSearch: verifiedLike && hasCoords,
      heatMaps: verifiedLike && hasCoords,
      neighbourhoodInsights: verifiedLike && Boolean(address.suburb),
    },
  };
}
