import type { Hsc48CoverageFractions, Hsc48Metrics } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { Hi50RateValue, Hi50SuccessRates } from "./types";

function rate(numerator: number, denominator: number): Hi50RateValue {
  if (denominator <= 0) return "INSUFFICIENT_DATA";
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function computeSuccessRates(
  metrics: Hsc48Metrics,
  coverage: Hsc48CoverageFractions,
): Hi50SuccessRates {
  return {
    fetchSuccessRate: rate(metrics.successfulFetches, metrics.fetchAttempted),
    snapshotRate: rate(metrics.snapshots, metrics.fetchAttempted),
    extractionRate: rate(metrics.extractionAttempted, coverage.total),
    outcomeEvidenceRate: rate(coverage.outcomeEvidence, coverage.total),
    verifiedSalePriceRate: rate(metrics.verifiedSalePrices, coverage.total),
    denominators: {
      fetchAttempts: metrics.fetchAttempted,
      fetchSuccessful: metrics.successfulFetches,
      snapshots: metrics.snapshots,
      extractions: metrics.extractionAttempted,
      historicalEvents: coverage.total,
      outcomeEvidence: coverage.outcomeEvidence,
      verifiedSalePrices: metrics.verifiedSalePrices,
    },
  };
}
