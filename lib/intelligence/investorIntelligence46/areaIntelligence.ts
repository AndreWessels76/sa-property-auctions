/**
 * Area / agency intelligence extensions (II 4.6).
 */

import { buildMarketEvidenceSummary } from "@/lib/intelligence/investorIntelligence45/marketEvidence";
import type { BuildContext } from "@/lib/intelligence/investorIntelligence45/types";
import { INVESTOR_INTELLIGENCE46_VERSION, II46_MINIMUM_MARKET_SALES } from "./config";
import { detectAcquisitionGaps46 } from "./acquisitionGaps";
import type { AgencyIntelligence46, AreaIntelligence46, CoverageLevel } from "./types";
import type { Property } from "@/lib/types/property";

function coverageFromSummary(summary: ReturnType<typeof buildMarketEvidenceSummary>): CoverageLevel {
  if (summary.conflictCount > 0) return "CONFLICT";
  if (summary.verifiedSalePriceCount >= II46_MINIMUM_MARKET_SALES) return "HIGH";
  if (summary.verifiedSalePriceCount >= 2) return "MEDIUM";
  if (summary.historicalEventCount > 0) return "LOW";
  return "INSUFFICIENT_DATA";
}

export function buildAreaIntelligence46(ctx: BuildContext, town: string): AreaIntelligence46 {
  const summary = buildMarketEvidenceSummary(ctx);
  const coverage = coverageFromSummary(summary);
  const stubProperty = { town, suburb: null, auction_agency: ctx.agency } as Property;

  return {
    town,
    historicalEventCount: summary.historicalEventCount,
    confirmedOutcomes: summary.confirmedSold + summary.confirmedPassedIn,
    verifiedSales: summary.verifiedSalePriceCount,
    evidenceCoverage: coverage,
    comparableCoverage: summary.comparableReadyCount,
    acquisitionGaps: detectAcquisitionGaps46({
      property: stubProperty,
      ctx,
      comparableCount: summary.comparableReadyCount,
      rejectedComparableCount: 0,
      hasConflict: summary.conflictCount > 0,
      historicalEventCount: summary.historicalEventCount,
    }),
    marketStatisticsAvailable: summary.verifiedSalePriceCount >= II46_MINIMUM_MARKET_SALES,
    dataFreshness: summary.lastEvidenceUpdate,
    sourceCoverage: Object.keys(summary.sourceQuality).length,
    status: coverage,
    provenance: { version: INVESTOR_INTELLIGENCE46_VERSION },
  };
}

export function buildAgencyIntelligence46(
  ctx: BuildContext,
  agency: string,
): AgencyIntelligence46 {
  const base = buildAreaIntelligence46(ctx, ctx.town ?? "all");
  return {
    ...base,
    agency,
    listingActivity: ctx.observations.filter((o) => o.agency?.toLowerCase() === agency.toLowerCase()).length,
  };
}
