/**
 * Coverage and exclusion reporting for historical intelligence.
 */

import type {
  ExclusionRecord,
  HistoricalEventObservation,
  ExclusionReason,
} from "./types";
import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";

export function coverageSnapshot(rows: HistoricalEventObservation[]): {
  eventCount: number;
  verifiedCount: number;
  sourceCount: number;
  priceCoverageSale: { numerator: number; denominator: number };
  priceCoverageAuction: { numerator: number; denominator: number };
  sizeCoverageFloor: { numerator: number; denominator: number };
  sizeCoverageHectares: { numerator: number; denominator: number };
  dateCoverage: { numerator: number; denominator: number };
  sources: string[];
} {
  const sources = [
    ...new Set(rows.map((r) => r.sourceName).filter((s): s is string => Boolean(s))),
  ];
  const denom = rows.length;
  return {
    eventCount: denom,
    verifiedCount: rows.filter((r) => r.verified).length,
    sourceCount: sources.length,
    priceCoverageSale: {
      numerator: rows.filter((r) => isValidPositiveAmount(r.prices.sale_price)).length,
      denominator: denom,
    },
    priceCoverageAuction: {
      numerator: rows.filter((r) => isValidPositiveAmount(r.prices.auction_price)).length,
      denominator: denom,
    },
    sizeCoverageFloor: {
      numerator: rows.filter((r) => isValidPositiveArea(r.floorSizeM2)).length,
      denominator: denom,
    },
    sizeCoverageHectares: {
      numerator: rows.filter((r) => isValidPositiveArea(r.hectares)).length,
      denominator: denom,
    },
    dateCoverage: {
      numerator: rows.filter((r) => r.auctionDate != null).length,
      denominator: denom,
    },
    sources,
  };
}

export function exclusionRecords(
  all: HistoricalEventObservation[],
): ExclusionRecord[] {
  return all
    .filter((r) => r.exclusionReasons.length > 0)
    .map((r) => ({
      observationId: r.observationId,
      reasons: r.exclusionReasons,
      state: r.state,
      auctionEventId: r.auctionEventId,
      listingPropertyId: r.listingPropertyId,
    }));
}

export function countByReason(
  records: ExclusionRecord[],
): Record<ExclusionReason, number> {
  const out = {} as Record<ExclusionReason, number>;
  for (const r of records) {
    for (const reason of r.reasons) {
      out[reason] = (out[reason] ?? 0) + 1;
    }
  }
  return out;
}
