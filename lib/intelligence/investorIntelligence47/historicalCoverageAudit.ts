/**
 * Per-event historical coverage audit (II 4.7).
 * Uses HI 4.2 resolution — never infers SOLD from expired/closed/completed.
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { HistoricalEvidenceScore } from "@/lib/intelligence/historicalEvidence/types";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { resolveHistoricalEvent } from "@/lib/intelligence/historicalResolution/resolver";
import { buildSaleEvidence } from "@/lib/intelligence/comparables/saleEvidence";
import type { PricingObservationRow } from "@/lib/repositories/PricingObservationRepository";
import type { ResolutionState } from "@/lib/intelligence/historicalResolution/types";

export type HistoricalEventCoverageRow = {
  observationId: string;
  propertyMasterId: string | null;
  auctionEventId: string | null;
  listingPropertyId: string | null;
  sourceUrl: string | null;
  agency: string | null;
  auctionDate: string | null;
  snapshotAvailable: boolean;
  extractionAvailable: boolean;
  outcomeResolution: string | null;
  salePriceResolution: number | null | "SOLD_WITHOUT_PRICE" | "NOT_VERIFIED";
  resolutionState: ResolutionState;
  evidenceQuality: HistoricalEvidenceScore["overallConfidence"];
  identityReviewRequired: boolean;
};

export function auditHistoricalEventCoverage(input: {
  observation: HistoricalEventObservation;
  classification: OutcomeClassification;
  score: HistoricalEvidenceScore;
  outcomeObs?: OutcomeObservationRow | null;
  pricingObs: PricingObservationRow[];
  enrichmentRuns: EnrichmentRunRow[];
  openConflict?: boolean;
  openReview?: boolean;
}): HistoricalEventCoverageRow {
  const resolution = resolveHistoricalEvent({
    observation: input.observation,
    classification: input.classification,
    score: input.score,
    outcomeObs: input.outcomeObs,
    openConflict: input.openConflict,
    openReview: input.openReview,
  });

  const sale = buildSaleEvidence(input.observation, input.pricingObs);
  const propertyRuns = input.enrichmentRuns.filter(
    (r) => r.property_id === input.observation.listingPropertyId,
  );
  const hasSnapshot = propertyRuns.some(
    (r) => r.snapshot_id != null || r.status === "NO_CHANGE" || r.status === "COMPLETED",
  );
  const hasExtraction = Boolean(input.outcomeObs) || resolution.outcome != null;

  let salePriceResolution: HistoricalEventCoverageRow["salePriceResolution"] = "NOT_VERIFIED";
  if (resolution.outcome === "SOLD" && sale.verifiedSale && sale.salePrice != null) {
    salePriceResolution = sale.salePrice;
  } else if (resolution.outcome === "SOLD" && !sale.verifiedSale) {
    salePriceResolution = "SOLD_WITHOUT_PRICE";
  }

  return {
    observationId: input.observation.observationId,
    propertyMasterId: input.observation.propertyMasterId,
    auctionEventId: input.observation.auctionEventId,
    listingPropertyId: input.observation.listingPropertyId,
    sourceUrl: input.observation.sourceUrl,
    agency: input.observation.agency,
    auctionDate: input.observation.auctionDate,
    snapshotAvailable: hasSnapshot,
    extractionAvailable: hasExtraction,
    outcomeResolution: resolution.outcome,
    salePriceResolution,
    resolutionState: resolution.state,
    evidenceQuality: input.score.overallConfidence,
    identityReviewRequired: resolution.identityReviewRequired,
  };
}

export function summarizeHistoricalCoverage(rows: HistoricalEventCoverageRow[]) {
  return {
    total: rows.length,
    snapshotAvailable: rows.filter((r) => r.snapshotAvailable).length,
    extractionAvailable: rows.filter((r) => r.extractionAvailable).length,
    verifiedSold: rows.filter(
      (r) => r.outcomeResolution === "SOLD" && r.resolutionState === "VERIFIED",
    ).length,
    soldWithoutPrice: rows.filter((r) => r.salePriceResolution === "SOLD_WITHOUT_PRICE").length,
    verifiedSalePrices: rows.filter((r) => typeof r.salePriceResolution === "number").length,
    reviewRequired: rows.filter(
      (r) => r.resolutionState === "REVIEW_REQUIRED" || r.identityReviewRequired,
    ).length,
    conflicts: rows.filter((r) => r.resolutionState === "CONFLICT").length,
    insufficientData: rows.filter(
      (r) => r.resolutionState === "INSUFFICIENT_DATA" || r.resolutionState === "UNRESOLVED",
    ).length,
  };
}
