/**
 * Provenance helpers — every statistic must name its sample.
 */

import type { HistoricalEventObservation, NumericMetric } from "./types";

export function provenanceForMetric(
  metric: NumericMetric,
  rows: HistoricalEventObservation[],
): {
  version: string;
  sampleSize: number;
  auctionEventIds: string[];
  propertyMasterIds: string[];
  sources: string[];
  definition: string;
  coverage: string;
} {
  const withPrice = rows.filter((r) => {
    if (!metric.priceKind) return true;
    const v = r.prices[metric.priceKind];
    return v != null && Number.isFinite(v) && v > 0;
  });
  return {
    version: "historical-intelligence-2.0.0",
    sampleSize: metric.count,
    auctionEventIds: withPrice
      .map((r) => r.auctionEventId)
      .filter((id): id is string => Boolean(id))
      .slice(0, 50),
    propertyMasterIds: [
      ...new Set(
        withPrice
          .map((r) => r.propertyMasterId)
          .filter((id): id is string => Boolean(id)),
      ),
    ].slice(0, 50),
    sources: [
      ...new Set(
        withPrice
          .map((r) => r.sourceName)
          .filter((s): s is string => Boolean(s)),
      ),
    ],
    definition: metric.definition,
    coverage: metric.coverageLabel,
  };
}
