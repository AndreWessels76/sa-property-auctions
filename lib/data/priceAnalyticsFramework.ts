/**
 * Price analytics framework (no fabricated calculations).
 * UI uses PriceSpreadCard when both estimate and auction price exist.
 */
export type PriceAnalyticsFramework = {
  estimatedValue: number | null;
  reservePrice: number | null;
  auctionPrice: number | null;
  discountPercent: number | null;
  spread: number | null;
  valueScore: number | null;
  confidence: number | null;
};

export function buildPriceAnalytics(input: {
  estimatedValue?: number | null;
  reservePrice?: number | null;
  auctionPrice?: number | null;
}): PriceAnalyticsFramework {
  const estimated = input.estimatedValue ?? null;
  const auction = input.auctionPrice ?? null;
  const canCompute =
    estimated != null && estimated > 0 && auction != null && auction > 0;

  return {
    estimatedValue: estimated,
    reservePrice: input.reservePrice ?? null,
    auctionPrice: auction,
    discountPercent: canCompute
      ? Math.round(((estimated! - auction!) / estimated!) * 100)
      : null,
    spread: canCompute ? Math.abs(estimated! - auction!) : null,
    valueScore: null,
    confidence: canCompute ? 40 : null,
  };
}

export const PRICE_ANALYTICS_INSUFFICIENT =
  "Price spread cannot yet be calculated because sufficient valuation data is not available.";
