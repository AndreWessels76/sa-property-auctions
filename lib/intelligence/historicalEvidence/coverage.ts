/**
 * Historical Intelligence 4.0 — data coverage KPI dashboard.
 */

import type { HistoricalCoverageDashboard, HistoricalEvidenceScore, ScoredEvent } from "./types";
import type { EvidenceConfidenceLevel } from "./config";
import { isConfirmedOutcome } from "@/lib/intelligence/outcomes/classification";
import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";

function aggregateConfidence(scores: HistoricalEvidenceScore[]): EvidenceConfidenceLevel {
  if (scores.length === 0) return "INSUFFICIENT";
  const map = { HIGH: 3, MEDIUM: 2, LOW: 1, INSUFFICIENT: 0 };
  const avg =
    scores.reduce((a, s) => a + map[s.overallConfidence], 0) / scores.length;
  if (avg >= 2.5) return "HIGH";
  if (avg >= 1.5) return "MEDIUM";
  if (avg >= 0.75) return "LOW";
  return "INSUFFICIENT";
}

export function buildCoverageDashboard(events: ScoredEvent[]): HistoricalCoverageDashboard {
  const rows = events.map((e) => e.observation);
  const scores = events.map((e) => e.score);
  const classifications = events.map((e) => e.classification);

  const confirmed = classifications.filter((c) => isConfirmedOutcome(c.outcome));
  const unknown = classifications.filter(
    (c) => c.outcome === "UNKNOWN" || c.outcome === "COMPLETED_UNKNOWN",
  );
  const verifiedSalePrices = classifications.filter(
    (c) =>
      c.outcome === "SOLD" &&
      isValidPositiveAmount(c.salePrice.salePrice) &&
      c.salePrice.salePriceConfidence !== "low" &&
      !c.salePrice.conflict,
  );

  return {
    totalHistoricalEvents: rows.length,
    confirmedOutcomes: confirmed.length,
    unknownOutcomes: unknown.length,
    verifiedSalePrices: verifiedSalePrices.length,
    eventsWithPricingEvidence: rows.filter(
      (r) =>
        isValidPositiveAmount(r.prices.sale_price) ||
        isValidPositiveAmount(r.prices.auction_price) ||
        isValidPositiveAmount(r.prices.guide_price),
    ).length,
    eventsWithSourceEvidence: rows.filter((r) => Boolean(r.sourceUrl?.trim())).length,
    eventsWithLocationEvidence: rows.filter(
      (r) => Boolean(r.town?.trim()) || Boolean(r.suburb?.trim()),
    ).length,
    eventsWithSizeEvidence: rows.filter(
      (r) => isValidPositiveArea(r.floorSizeM2) || isValidPositiveArea(r.hectares),
    ).length,
    comparableReadyEvents: scores.filter((s) => s.comparableReady).length,
    marketStatisticsReadyEvents: scores.filter((s) => s.marketStatisticsReady).length,
    insufficientDataCases: scores.filter((s) => s.overallConfidence === "INSUFFICIENT").length,
    averageOverallConfidence: aggregateConfidence(scores),
  };
}
