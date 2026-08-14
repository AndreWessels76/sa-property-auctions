import type { Hsc48Metrics } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { Hi50RateValue } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi51ChainSuccessRates } from "./types";

function rate(numerator: number, denominator: number): Hi50RateValue {
  if (denominator <= 0) return "INSUFFICIENT_DATA";
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function computeChainSuccessRates(metrics: Hsc48Metrics, outcomeEvidence: number): Hi51ChainSuccessRates {
  return {
    fetchSuccessRate: rate(metrics.successfulFetches, metrics.fetchAttempted),
    snapshotRate: rate(metrics.snapshots, metrics.successfulFetches),
    extractionRate: rate(metrics.extractionAttempted, metrics.snapshots),
    outcomeEvidenceRate: rate(outcomeEvidence, metrics.extractionAttempted),
    salePriceRate: rate(metrics.verifiedSalePrices, outcomeEvidence),
    denominators: {
      fetchAttempts: metrics.fetchAttempted,
      successfulFetches: metrics.successfulFetches,
      snapshots: metrics.snapshots,
      extractions: metrics.extractionAttempted,
      outcomeEvidence,
    },
  };
}
