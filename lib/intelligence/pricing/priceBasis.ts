/**
 * Price field semantics — never substitute one field for another.
 */

import { isValidPositiveAmount } from "./priceCalculations";

export type PriceFieldKind =
  | "auction_price"
  | "reserve_price"
  | "guide_price"
  | "estimated_value"
  | "sale_price"
  | "opening_bid"
  | "winning_bid";

export type PriceBasis =
  | "auction_price"
  | "reserve_price"
  | "guide_price"
  | "estimated_value"
  | "sale_price"
  | "winning_bid";

export const PRICE_FIELD_LABELS: Record<PriceFieldKind, string> = {
  auction_price: "Auction price",
  reserve_price: "Reserve price",
  guide_price: "Guide price",
  estimated_value: "Estimated value",
  sale_price: "Sale price",
  opening_bid: "Opening bid",
  winning_bid: "Winning bid",
};

export type ReferenceBasis =
  | "estimated_value"
  | "guide_price"
  | "reserve_price"
  | "sale_price"
  | "winning_bid";

export const REFERENCE_LABELS: Record<ReferenceBasis, string> = {
  reserve_price: "Reserve Price",
  guide_price: "Guide Price",
  estimated_value: "Estimated Value",
  sale_price: "Historical Sale",
  winning_bid: "Historical Winning Bid",
};

export type AreaBasis = "building_m2" | "hectares";

export function unitAnalysisLabel(
  priceBasis: PriceBasis,
  areaBasis: AreaBasis,
): string {
  const price = PRICE_FIELD_LABELS[priceBasis] ?? priceBasis;
  if (areaBasis === "building_m2") {
    return `${price} per building m²`;
  }
  return `${price} per hectare`;
}

/**
 * Reference selection priority for auction-vs-reference analysis.
 * Never treats auction_price as estimated_value or sale_price.
 * Guide on the listing is only used when explicitly supplied as guidePrice
 * (separate from auction_price).
 */
export function selectReferencePrice(input: {
  estimatedValue?: number | null;
  guidePrice?: number | null;
  reservePrice?: number | null;
  historicalSalePrice?: number | null;
}): { value: number; basis: ReferenceBasis; label: string } | null {
  if (isValidPositiveAmount(input.estimatedValue)) {
    return {
      value: input.estimatedValue,
      basis: "estimated_value",
      label: REFERENCE_LABELS.estimated_value,
    };
  }
  if (isValidPositiveAmount(input.guidePrice)) {
    return {
      value: input.guidePrice,
      basis: "guide_price",
      label: REFERENCE_LABELS.guide_price,
    };
  }
  if (isValidPositiveAmount(input.reservePrice)) {
    return {
      value: input.reservePrice,
      basis: "reserve_price",
      label: REFERENCE_LABELS.reserve_price,
    };
  }
  if (isValidPositiveAmount(input.historicalSalePrice)) {
    return {
      value: input.historicalSalePrice,
      basis: "sale_price",
      label: REFERENCE_LABELS.sale_price,
    };
  }
  return null;
}
