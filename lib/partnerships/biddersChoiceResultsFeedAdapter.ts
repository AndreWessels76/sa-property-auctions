/**
 * Minimal adapter: partner post-auction payload → AuctionPartnerResultRecord.
 * Does not invent credentials, endpoints, or sale prices.
 */

import type {
  AuctionPartnerResultRecord,
  PartnerResultsOutcome,
  PartnerResultsPriceClassification,
} from "./auctionPartnerResultsFeedContract";

export type BiddersChoiceResultsFeedRawPayload = {
  externalResultId: string;
  partnerCode?: string;
  propertyReference?: string | null;
  propertyAddress?: string | null;
  address?: string | null;
  town?: string | null;
  suburb?: string | null;
  province?: string | null;
  auctionDate?: string | null;
  outcome: string;
  salePrice?: number | null;
  currency?: string | null;
  priceClassification?: string | null;
  guidePrice?: number | null;
  reservePrice?: number | null;
  auctionPrice?: number | null;
  startingBid?: number | null;
  sourceUrl?: string | null;
  sourceReference?: string | null;
  observedAt: string;
  publishedAt?: string | null;
  evidenceText?: string | null;
  externalEventId?: string | null;
  retrievedAt?: string | null;
  contentHash?: string | null;
};

const OUTCOME_MAP: Record<string, PartnerResultsOutcome> = {
  SOLD: "SOLD",
  "SOLD AT AUCTION": "SOLD",
  "SUCCESSFULLY SOLD": "SOLD",
  PASSED_IN: "PASSED_IN",
  "PASSED IN": "PASSED_IN",
  WITHDRAWN: "WITHDRAWN",
  CANCELLED: "CANCELLED",
  CANCELED: "CANCELLED",
  EXPIRED: "EXPIRED",
  UNKNOWN: "UNKNOWN",
};

function mapOutcome(raw: string): PartnerResultsOutcome {
  const key = raw.trim().toUpperCase();
  if (OUTCOME_MAP[key]) return OUTCOME_MAP[key]!;
  if (key.startsWith("SOLD")) return "SOLD";
  return "UNKNOWN";
}

function mapPriceClassification(
  raw: string | null | undefined,
): PartnerResultsPriceClassification | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const allowed: PartnerResultsPriceClassification[] = [
    "ACTUAL_SALE_PRICE",
    "guide_price",
    "reserve_price",
    "asking_price",
    "listing_price",
    "advertised_price",
    "auction_price",
    "starting_bid",
    "opening_bid",
    "estimate",
    "estimated_value",
    "valuation",
    "market_value",
    "municipal_value",
    "agent_estimate",
    "unknown",
  ];
  if ((allowed as string[]).includes(key)) {
    return key as PartnerResultsPriceClassification;
  }
  if (key === "sale_price" || key === "actual_sale_price" || key === "transaction") {
    return "ACTUAL_SALE_PRICE";
  }
  return "unknown";
}

/**
 * Map a partner results payload into the existing contract record.
 * Never promotes guide/reserve/auction/starting fields into salePrice.
 */
export function adaptBiddersChoiceResultsPayload(
  payload: BiddersChoiceResultsFeedRawPayload,
  opts?: { retrievedAt?: string },
): AuctionPartnerResultRecord {
  const salePrice =
    payload.salePrice != null && Number.isFinite(payload.salePrice)
      ? payload.salePrice
      : null;

  // If only non-sale prices are present, leave salePrice null and classify accordingly
  let priceClassification = mapPriceClassification(payload.priceClassification);
  if (salePrice != null && !priceClassification) {
    priceClassification = "ACTUAL_SALE_PRICE";
  }

  const retrievedAt =
    opts?.retrievedAt ??
    payload.retrievedAt ??
    new Date().toISOString();

  return {
    partnerCode: (payload.partnerCode ?? "bidders_choice").trim() || "bidders_choice",
    externalResultId: payload.externalResultId.trim(),
    externalEventId: payload.externalEventId ?? null,
    externalPropertyId: payload.propertyReference ?? null,
    address: payload.propertyAddress ?? payload.address ?? null,
    town: payload.town ?? null,
    suburb: payload.suburb ?? null,
    province: payload.province ?? null,
    auctionDate: payload.auctionDate ?? null,
    outcome: mapOutcome(payload.outcome),
    salePrice,
    currency: payload.currency ?? "ZAR",
    priceClassification,
    guidePrice: payload.guidePrice ?? null,
    reservePrice: payload.reservePrice ?? null,
    auctionPrice: payload.auctionPrice ?? null,
    startingBid: payload.startingBid ?? null,
    sourceUrl: payload.sourceUrl ?? null,
    sourceReference: payload.sourceReference ?? payload.externalResultId,
    observedAt: payload.observedAt,
    publishedAt: payload.publishedAt ?? null,
    evidenceText: payload.evidenceText ?? null,
    provenance: {
      sourceType: "PARTNER_RESULTS_FEED",
      sourceId: payload.externalResultId,
      retrievedAt,
      contentHash: payload.contentHash ?? null,
    },
  };
}

export function adaptBiddersChoiceResultsBatch(
  payloads: BiddersChoiceResultsFeedRawPayload[],
  opts?: { retrievedAt?: string },
): AuctionPartnerResultRecord[] {
  return payloads.map((p) => adaptBiddersChoiceResultsPayload(p, opts));
}
