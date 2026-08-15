/**
 * Partnership data contract — interface only.
 * No fake partners. Enables future auction-house verified feeds.
 */

export type AuctionHouseEvidenceContribution = {
  partnerCode: string;
  partnerName: string;
  propertyExternalId: string | null;
  propertyMasterId: string | null;
  auctionEventExternalId: string | null;
  auctionDate: string | null;
  outcome:
    | "SOLD"
    | "WITHDRAWN"
    | "CANCELLED"
    | "PASSED_IN"
    | "POSTPONED"
    | "UNKNOWN";
  salePrice: number | null;
  currency: "ZAR";
  /** Must be true for salePrice to be accepted downstream. */
  verifiedSale: boolean;
  sourceUrl: string | null;
  observedAt: string;
  evidenceText: string | null;
  confidence: "high" | "medium" | "low";
};

export type PartnerFeedContract = {
  version: "auction-partner-feed-1.0.0";
  direction: "partner → SA Property Auctions → evidence graph → investor intelligence";
  acceptedOutcomes: AuctionHouseEvidenceContribution["outcome"][];
  salePriceRules: {
    requiresVerifiedSaleFlag: true;
    rejectedKinds: Array<
      | "guide_price"
      | "reserve_price"
      | "asking_price"
      | "auction_price"
      | "starting_bid"
      | "estimate"
      | "valuation"
    >;
  };
  provenanceRequired: Array<
    "partnerCode" | "observedAt" | "sourceUrl" | "evidenceText" | "confidence"
  >;
};

export const AUCTION_PARTNER_FEED_CONTRACT: PartnerFeedContract = {
  version: "auction-partner-feed-1.0.0",
  direction: "partner → SA Property Auctions → evidence graph → investor intelligence",
  acceptedOutcomes: [
    "SOLD",
    "WITHDRAWN",
    "CANCELLED",
    "PASSED_IN",
    "POSTPONED",
    "UNKNOWN",
  ],
  salePriceRules: {
    requiresVerifiedSaleFlag: true,
    rejectedKinds: [
      "guide_price",
      "reserve_price",
      "asking_price",
      "auction_price",
      "starting_bid",
      "estimate",
      "valuation",
    ],
  },
  provenanceRequired: [
    "partnerCode",
    "observedAt",
    "sourceUrl",
    "evidenceText",
    "confidence",
  ],
};

export function acceptPartnerSalePrice(
  contribution: AuctionHouseEvidenceContribution,
): { ok: true; salePrice: number } | { ok: false; reason: string } {
  if (!contribution.verifiedSale) {
    return { ok: false, reason: "verifiedSale must be true" };
  }
  if (contribution.salePrice == null || contribution.salePrice <= 0) {
    return { ok: false, reason: "salePrice missing or invalid" };
  }
  if (contribution.outcome !== "SOLD") {
    return { ok: false, reason: "sale price only accepted with explicit SOLD outcome" };
  }
  return { ok: true, salePrice: contribution.salePrice };
}
