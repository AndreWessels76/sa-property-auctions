/**
 * Admin dashboard aggregates (II 4.6).
 */

import type { BuildContext } from "@/lib/intelligence/investorIntelligence45/types";
import { buildMarketEvidenceSummary } from "@/lib/intelligence/investorIntelligence45/marketEvidence";
import { detectAcquisitionGaps46, countGapsByPriority } from "./acquisitionGaps";
import type { CoverageLevel, InvestorDashboard46 } from "./types";
import type { Property } from "@/lib/types/property";

function stubProperty(ctx: BuildContext): Property {
  const o = ctx.observations[0];
  return {
    id: o?.listingPropertyId ?? "stub",
    title: "",
    description: null,
    province: o?.province ?? "",
    town: o?.town ?? ctx.town ?? "",
    suburb: o?.suburb ?? null,
    address: null,
    property_type: o?.propertyType ?? "",
    bedrooms: o?.bedrooms ?? 0,
    bathrooms: o?.bathrooms ?? 0,
    garages: 0,
    estimated_value: 0,
    auction_price: o?.prices.auction_price ?? 0,
    auction_date: o?.auctionDate ?? "",
    status: "unknown",
    source: o?.sourceName ?? null,
    property_master_id: o?.propertyMasterId ?? null,
    source_url: o?.sourceUrl ?? null,
    source_name: o?.sourceName ?? null,
    auction_agency: o?.agency ?? null,
    verification_state: o?.verified ? "verified" : null,
  } as Property;
}

function levelForCtx(ctx: BuildContext): CoverageLevel {
  const s = buildMarketEvidenceSummary(ctx);
  if (s.conflictCount > 0) return "CONFLICT";
  if (s.verifiedSalePriceCount >= 5) return "HIGH";
  if (s.verifiedSalePriceCount >= 2 || s.historicalEventCount >= 3) return "MEDIUM";
  if (s.historicalEventCount > 0) return "LOW";
  return "INSUFFICIENT_DATA";
}

export function buildInvestorDashboard46(
  propertyContexts: BuildContext[],
): InvestorDashboard46 {
  let highEvidence = 0;
  let mediumEvidence = 0;
  let lowEvidence = 0;
  let insufficientData = 0;
  let conflicts = 0;
  const allGaps = [];

  for (const ctx of propertyContexts) {
    const level = levelForCtx(ctx);
    if (level === "HIGH") highEvidence++;
    else if (level === "MEDIUM") mediumEvidence++;
    else if (level === "LOW") lowEvidence++;
    else if (level === "CONFLICT") conflicts++;
    else insufficientData++;

    const summary = buildMarketEvidenceSummary(ctx);
    if (summary.conflictCount > 0) conflicts++;

    allGaps.push(
      ...detectAcquisitionGaps46({
        property: stubProperty(ctx),
        ctx,
        comparableCount: summary.comparableReadyCount,
        rejectedComparableCount: 0,
        hasConflict: summary.conflictCount > 0,
        historicalEventCount: summary.historicalEventCount,
      }),
    );
  }

  const pri = countGapsByPriority(allGaps);

  return {
    propertiesAnalysed: propertyContexts.length,
    highEvidence,
    mediumEvidence,
    lowEvidence,
    insufficientData,
    conflicts,
    acquisitionGaps: pri.total,
    p1: pri.p1,
    p2: pri.p2,
    p3: pri.p3,
    p4: pri.p4,
  };
}
