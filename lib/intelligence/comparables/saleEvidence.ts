/**
 * Sale evidence — strict price semantics. Never cross-map price kinds.
 */

import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { PricingObservationRow } from "@/lib/repositories/PricingObservationRepository";
import type { SaleEvidence } from "./types";

function conflictOnField(rows: PricingObservationRow[], field: string): boolean {
  const trusted = rows.filter(
    (o) => o.field_name === field && o.status !== "conflict" && isValidPositiveAmount(o.normalized_value),
  );
  const conflicts = rows.filter((o) => o.field_name === field && o.status === "conflict");
  if (conflicts.length > 0) return true;
  const values = new Set(trusted.map((o) => o.normalized_value));
  return values.size > 1;
}

export function buildSaleEvidence(
  row: HistoricalEventObservation,
  pricingObservations: PricingObservationRow[] = [],
): SaleEvidence {
  const obs = pricingObservations.filter(
    (o) =>
      (row.auctionEventId && o.auction_event_id === row.auctionEventId) ||
      (row.listingPropertyId && o.property_id === row.listingPropertyId) ||
      (row.propertyMasterId && o.property_master_id === row.propertyMasterId),
  );

  const saleConflict = conflictOnField(obs, "sale_price");
  const verifiedSale = row.state === "sold" && isValidPositiveAmount(row.prices.sale_price);

  return {
    salePrice: saleConflict ? null : row.prices.sale_price,
    salePriceLabel: saleConflict
      ? "Conflict — two verified source values"
      : verifiedSale
        ? "Verified sale price"
        : row.prices.sale_price != null
          ? "Sale price supplied"
          : "Not supplied",
    salePriceConflict: saleConflict,
    salePriceConflictNote: saleConflict
      ? "Conflict — two verified source values"
      : null,
    auctionPrice: row.prices.auction_price,
    guidePrice: row.prices.guide_price,
    reservePrice: row.prices.reserve_price,
    estimatedValue: row.prices.estimated_value,
    startingBid: row.prices.starting_bid,
    verifiedSale,
    outcome: row.state,
  };
}

export function assertPriceKindSeparation(prices: HistoricalEventObservation["prices"]): boolean {
  const sale = prices.sale_price;
  if (!isValidPositiveAmount(sale)) return true;
  return (
    sale !== prices.auction_price &&
    sale !== prices.guide_price &&
    sale !== prices.reserve_price &&
    sale !== prices.estimated_value
  );
}
