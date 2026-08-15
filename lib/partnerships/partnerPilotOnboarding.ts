/**
 * Auction-house partner pilot onboarding — architecture only.
 * No invented partner names. Partner data still must pass HI 4.2 resolution.
 */

import {
  AUCTION_PARTNER_FEED_CONTRACT,
  acceptPartnerSalePrice,
  type AuctionHouseEvidenceContribution,
  type PartnerFeedContract,
} from "./auctionPartnerFeedContract";

export type PartnerFeedType = "push_api" | "pull_csv" | "pull_json" | "manual_upload";

export type PartnerPilotOnboarding = {
  partnerCode: string;
  partnerName: string;
  feedType: PartnerFeedType;
  authentication: "api_key" | "oauth2" | "mutual_tls" | "signed_webhook" | "unconfigured";
  sourceTier: "TIER_1_AUCTION_HOUSE" | "TIER_2_LICENSED" | "TIER_3_PARTNER" | "UNKNOWN";
  coverageNotes: string;
  dataFreshnessSlaHours: number | null;
  fieldMappingComplete: boolean;
  validationEnabled: boolean;
  provenanceRequired: true;
  conflictHandling: "queue_review" | "prefer_partner" | "prefer_existing" | "unconfigured";
  status: "DRAFT" | "READY_FOR_PILOT" | "ACTIVE_PILOT" | "PAUSED";
  /** Partner contributions never auto-verify — they enter the same evidence pipeline. */
  autoVerified: false;
};

export type PartnerPilotRegistry = {
  version: "auction-partner-pilot-1.0.0";
  feedContract: PartnerFeedContract;
  /** Empty until real partners onboard — never invent names. */
  pilots: PartnerPilotOnboarding[];
  activePartners: number;
  verifiedPartnerEvidence: number;
};

export function createEmptyPartnerPilotRegistry(): PartnerPilotRegistry {
  return {
    version: "auction-partner-pilot-1.0.0",
    feedContract: AUCTION_PARTNER_FEED_CONTRACT,
    pilots: [],
    activePartners: 0,
    verifiedPartnerEvidence: 0,
  };
}

export function validatePartnerPilotDraft(
  draft: PartnerPilotOnboarding,
): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!draft.partnerCode.trim()) reasons.push("partnerCode required");
  if (!draft.partnerName.trim()) reasons.push("partnerName required");
  if (draft.authentication === "unconfigured") reasons.push("authentication unconfigured");
  if (!draft.fieldMappingComplete) reasons.push("field mapping incomplete");
  if (!draft.validationEnabled) reasons.push("validation must be enabled");
  if (draft.conflictHandling === "unconfigured") reasons.push("conflict handling unconfigured");
  if (draft.autoVerified !== false) reasons.push("autoVerified must be false");
  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true };
}

/**
 * Partner contribution gate — same sale-price safety as licensed sources.
 * Does not write; returns acceptance for the existing evidence pipeline.
 * Partner data never auto-verifies — always HI 4.2 next.
 */
export function admitPartnerContribution(
  contribution: AuctionHouseEvidenceContribution,
): {
  admitted: boolean;
  salePriceAccepted: boolean;
  reasons: string[];
  nextPipeline: "HI42_RESOLUTION";
} {
  const reasons: string[] = [];
  if (!contribution.partnerCode) reasons.push("missing partnerCode");
  if (!contribution.observedAt) reasons.push("missing observedAt");
  if (!contribution.sourceUrl && !contribution.evidenceText) {
    reasons.push("missing provenance (sourceUrl or evidenceText)");
  }

  let salePriceAccepted = false;
  if (contribution.salePrice != null) {
    const price = acceptPartnerSalePrice(contribution);
    if (!price.ok) {
      reasons.push(price.reason);
    } else {
      salePriceAccepted = true;
    }
  }

  return {
    admitted: reasons.length === 0,
    salePriceAccepted,
    reasons,
    nextPipeline: "HI42_RESOLUTION",
  };
}

/** Count active pilots from registry — never invent. */
export function countActivePartnerPilots(registry: PartnerPilotRegistry): number {
  return registry.pilots.filter((p) => p.status === "ACTIVE_PILOT").length;
}
