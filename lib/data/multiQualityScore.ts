import { resolveAuctionAgency } from "@/lib/auction/agencyDisplay";
import {
  isSeedOrDemo,
  normalizeListingStatus,
} from "@/lib/data/propertyFoundation";
import {
  normalizeVerificationState,
  type VerificationState,
} from "@/lib/data/verificationStates";
import type { PropertyQualityInput } from "@/lib/data/qualityScore";
import { scorePropertyQuality } from "@/lib/data/qualityScore";

export type MultiQualityScores = {
  completenessScore: number;
  verificationScore: number;
  imageScore: number;
  addressScore: number;
  auctionScore: number;
  sourceTrustScore: number;
  overallQualityScore: number;
  issues: string[];
};

/**
 * Admin-only multi-dimensional quality scoring (0–100 each + overall).
 * Deterministic. Never invents field values.
 */
export function scoreMultiDimensionalQuality(
  input: PropertyQualityInput & {
    verification_state?: string | null;
    imageQualityScore?: number | null;
    municipality?: string | null;
    auction_time?: string | null;
    auction_venue?: string | null;
    agency_contact?: string | null;
    catalogue_link?: string | null;
    brochure_link?: string | null;
    terms_link?: string | null;
  },
): MultiQualityScores {
  const base = scorePropertyQuality(input);
  const issues = [...base.issues];

  const completenessScore = base.score;

  let verificationScore = 0;
  const state = normalizeVerificationState(input.verification_state);
  if (state === "verified" && input.last_verified_at) verificationScore = 100;
  else if (state === "pending_verification") verificationScore = 40;
  else if (state === "seed" || isSeedOrDemo(input.data_classification, input.source)) {
    verificationScore = 10;
    issues.push("Still classified as seed/demo");
  } else if (input.last_verified_at) verificationScore = 70;
  else verificationScore = 25;

  const imageScore = Math.min(
    100,
    Math.max(0, Math.round(input.imageQualityScore ?? (input.hasImages ? 50 : 0))),
  );
  if (!input.hasImages) issues.push("No gallery images");

  let addressScore = 0;
  if (input.suburb?.trim()) addressScore += 20;
  if (input.town?.trim()) addressScore += 20;
  if (input.province?.trim()) addressScore += 20;
  if (input.postal_code?.trim()) addressScore += 10;
  if (input.address?.trim() || input.street_address?.trim()) addressScore += 15;
  if (input.latitude != null && input.longitude != null) addressScore += 15;
  else issues.push("Coordinates not verified");

  let auctionScore = 0;
  if (input.auction_date) auctionScore += 30;
  const agency =
    input.auction_agency?.trim() ||
    resolveAuctionAgency(input.source).name ||
    input.source_name?.trim();
  if (agency) auctionScore += 25;
  else issues.push("Auction agency unknown");
  if (input.auction_time?.trim()) auctionScore += 10;
  if (input.auction_venue?.trim()) auctionScore += 10;
  if (input.agency_contact?.trim() || input.agency_website?.trim()) {
    auctionScore += 10;
  }
  if (input.catalogue_link || input.brochure_link || input.terms_link) {
    auctionScore += 15;
  }
  auctionScore = Math.min(100, auctionScore);

  let sourceTrustScore = 0;
  if (input.source_name?.trim() || agency) sourceTrustScore += 30;
  if (input.source_url?.trim()) sourceTrustScore += 25;
  if (input.external_listing_id?.trim()) sourceTrustScore += 20;
  if (input.imported_at) sourceTrustScore += 10;
  if (state === "verified") sourceTrustScore += 15;
  else if (isSeedOrDemo(input.data_classification, input.source)) {
    sourceTrustScore = Math.min(sourceTrustScore, 20);
  }
  sourceTrustScore = Math.min(100, sourceTrustScore);

  const overallQualityScore = Math.round(
    completenessScore * 0.25 +
      verificationScore * 0.2 +
      imageScore * 0.1 +
      addressScore * 0.15 +
      auctionScore * 0.15 +
      sourceTrustScore * 0.15,
  );

  return {
    completenessScore,
    verificationScore,
    imageScore,
    addressScore,
    auctionScore,
    sourceTrustScore,
    overallQualityScore: Math.min(100, Math.max(0, overallQualityScore)),
    issues,
  };
}

export function resolveVerificationStateFromRow(input: {
  verification_state?: string | null;
  data_classification?: string | null;
  source?: string | null;
  last_verified_at?: string | null;
  listing_status?: string | null;
  status?: string | null;
}): VerificationState {
  const explicit = normalizeVerificationState(input.verification_state);
  if (explicit) return explicit;

  const lifecycle = normalizeListingStatus(
    input.listing_status ?? input.status,
  );
  if (lifecycle === "sold") return "sold";
  if (lifecycle === "withdrawn" || lifecycle === "cancelled") return "withdrawn";
  if (lifecycle === "completed") return "archived";

  if (isSeedOrDemo(input.data_classification, input.source)) return "seed";
  if (input.last_verified_at && input.data_classification === "production") {
    return "verified";
  }
  return "pending_verification";
}
