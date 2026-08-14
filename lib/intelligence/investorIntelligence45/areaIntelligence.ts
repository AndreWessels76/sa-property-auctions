/**
 * Area intelligence 4.5 — evidence-backed market statistics.
 */

import { buildSaleEvidence } from "@/lib/intelligence/comparables/saleEvidence";
import { median } from "@/lib/intelligence/historical/historicalMetrics";
import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import { INVESTOR_INTELLIGENCE45_VERSION, II45_MINIMUM_MARKET_SALES } from "./config";
import { buildMarketEvidenceSummary, filterVerifiedSaleObservations } from "./marketEvidence";
import type { AreaIntelligence45, BuildContext } from "./types";

export function buildAreaIntelligence45(ctx: BuildContext, town: string): AreaIntelligence45 {
  const summary = buildMarketEvidenceSummary(ctx);
  const verifiedSales = filterVerifiedSaleObservations(ctx);
  const salePrices = verifiedSales
    .map((o) => buildSaleEvidence(o).salePrice)
    .filter((p): p is number => isValidPositiveAmount(p));

  const marketStatisticsAvailable = salePrices.length >= II45_MINIMUM_MARKET_SALES;
  const insufficientReason = marketStatisticsAvailable
    ? null
    : `Only ${salePrices.length} verified sales available. Minimum required: ${II45_MINIMUM_MARKET_SALES}.`;

  const evidenceQuality: Record<string, number> = {
    high: summary.evidenceQuality.high,
    medium: summary.evidenceQuality.medium,
    low: summary.evidenceQuality.low,
    insufficient: summary.evidenceQuality.insufficient,
  };

  return {
    town,
    historicalVolume: summary.historicalEventCount,
    confirmedSales: summary.confirmedSold,
    confirmedUnsold: summary.confirmedPassedIn,
    withdrawn: summary.confirmedWithdrawn,
    cancelled: summary.confirmedCancelled,
    unknown: summary.unknownOutcomes,
    verifiedSalePriceCoverage: summary.verifiedSalePriceCount,
    comparableCoverage: summary.comparableReadyCount,
    evidenceQuality,
    marketStatisticsAvailable,
    insufficientReason,
    provenance: {
      version: INVESTOR_INTELLIGENCE45_VERSION,
      calculatedAt: new Date().toISOString(),
    },
  };
}

export function areaMedianIfSufficient(prices: number[]): number | null {
  if (prices.length < II45_MINIMUM_MARKET_SALES) return null;
  return median(prices);
}
