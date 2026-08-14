/**
 * Deterministic evidence quality assessment (HEQ 4.4).
 */

import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import { isConfirmedOutcome } from "@/lib/intelligence/outcomes/classification";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { HistoricalEvidenceScore } from "@/lib/intelligence/historicalEvidence/types";
import type { HistoricalEventResolution } from "@/lib/intelligence/historicalResolution/types";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import type { PricingObservationRow } from "@/lib/repositories/PricingObservationRepository";
import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { buildFieldEvidence } from "./fieldEvidence";
import { assessSourceQuality } from "./sourceQuality";
import { assessSourceConsistency } from "./sourceConsistency";
import { buildEvidenceChain } from "./evidenceChain";
import type { EvidenceQualityAssessment, EvidenceQualityOverall } from "./types";

function numericScore(score: HistoricalEvidenceScore): number {
  const levels = [
    score.outcomeEvidence.level,
    score.salePriceEvidence.level,
    score.sourceEvidence.level,
    score.dateEvidence.level,
    score.identityConfidence.level,
    score.locationConfidence.level,
    score.pricingConfidence.level,
    score.documentationConfidence.level,
  ];
  const map: Record<string, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
    INSUFFICIENT: 0,
  };
  const sum = levels.reduce((a, l) => a + (map[l] ?? 0), 0);
  return Math.round((sum / (levels.length * 3)) * 100);
}

function deriveOverallQuality(input: {
  score: HistoricalEvidenceScore;
  resolution: HistoricalEventResolution;
  sourceConsistency: ReturnType<typeof assessSourceConsistency>;
  openReview?: boolean;
  openConflict?: boolean;
  identityWeak?: boolean;
}): EvidenceQualityOverall {
  if (input.openConflict || input.resolution.state === "CONFLICT") return "CONFLICT";
  if (
    input.openReview ||
    input.resolution.state === "REVIEW_REQUIRED" ||
    input.resolution.identityReviewRequired
  ) {
    return "REVIEW_REQUIRED";
  }
  if (input.sourceConsistency === "CONFLICT") return "CONFLICT";
  if (input.resolution.state === "INSUFFICIENT_DATA") return "INSUFFICIENT_DATA";
  if (input.identityWeak) return "REVIEW_REQUIRED";

  const overall = input.score.overallConfidence;
  if (overall === "HIGH" && input.resolution.state === "VERIFIED") return "HIGH";
  if (overall === "HIGH") return "HIGH";
  if (overall === "MEDIUM") return "MEDIUM";
  if (overall === "LOW") return "LOW";
  return "INSUFFICIENT_DATA";
}

function reviewPriority(input: {
  quality: EvidenceQualityOverall;
  classification: OutcomeClassification;
  resolution: HistoricalEventResolution;
}): 1 | 2 | 3 | 4 | null {
  if (input.quality === "CONFLICT") return 1;
  if (
    input.classification.outcome === "SOLD" &&
    isValidPositiveAmount(input.classification.salePrice.salePrice) &&
    input.resolution.state !== "VERIFIED"
  ) {
    return 1;
  }
  if (isConfirmedOutcome(input.classification.outcome) && input.resolution.state !== "VERIFIED") {
    return 2;
  }
  if (input.resolution.identityReviewRequired) return 3;
  if (input.quality === "LOW" || input.quality === "INSUFFICIENT_DATA") return 4;
  return null;
}

export function assessEvidenceQuality(input: {
  event: HistoricalEventObservation;
  classification: OutcomeClassification;
  score: HistoricalEvidenceScore;
  resolution: HistoricalEventResolution;
  outcomeObs?: OutcomeObservationRow | null;
  pricingObs?: PricingObservationRow[];
  recentRuns?: EnrichmentRunRow[];
  openReview?: boolean;
  openConflict?: boolean;
}): EvidenceQualityAssessment {
  const fields = buildFieldEvidence({
    event: input.event,
    classification: input.classification,
    score: input.score,
    outcomeObs: input.outcomeObs,
    pricingObs: input.pricingObs,
  });

  const lastRun = input.recentRuns?.[0];
  const sourceQuality = assessSourceQuality({
    event: input.event,
    outcomeObs: input.outcomeObs,
    sourceHash: lastRun?.source_hash ?? input.resolution.provenance.sourceHash,
    fetchedAt: lastRun?.created_at ?? input.resolution.provenance.fetchedAt,
  });

  const sourceConsistency = assessSourceConsistency({
    currentHash: lastRun?.source_hash ?? input.resolution.provenance.sourceHash,
    previousHash: input.recentRuns?.[1]?.source_hash,
    outcomeObs: input.outcomeObs,
    recentRuns: input.recentRuns,
  });

  const identityWeak =
    !input.event.propertyMasterId &&
    !input.event.suburb?.trim() &&
    Boolean(input.event.town?.trim());

  const overallQuality = deriveOverallQuality({
    score: input.score,
    resolution: input.resolution,
    sourceConsistency,
    openReview: input.openReview,
    openConflict: input.openConflict,
    identityWeak,
  });

  const positiveEvidence: string[] = [];
  const missingEvidence: string[] = [];
  const conflicts: string[] = [...input.resolution.conflicts];

  for (const f of fields) {
    if (f.status === "VERIFIED" || f.status === "SOURCE_CONFIRMED") {
      positiveEvidence.push(`${f.field}: ${f.status}`);
    }
    if (f.status === "NOT_SUPPLIED" || f.status === "NOT_FOUND") {
      missingEvidence.push(f.field);
    }
    if (f.status === "CONFLICT") conflicts.push(`${f.field} conflict`);
  }

  const reasons: string[] = [
    input.score.overallReason,
    `Resolution: ${input.resolution.state}`,
    `Source tier: ${sourceQuality.sourceTier}`,
    `Consistency: ${sourceConsistency}`,
  ];

  if (identityWeak) reasons.push("Town + agency alone — identity review required");

  const snapshotCount = fields.filter((f) => f.snapshot).length > 0 ? 1 : 0;
  const sourceCount = input.event.sourceUrl ? 1 : 0;

  const priority = reviewPriority({
    quality: overallQuality,
    classification: input.classification,
    resolution: input.resolution,
  });

  return {
    observationId: input.event.observationId,
    auctionEventId: input.event.auctionEventId,
    propertyMasterId: input.event.propertyMasterId,
    listingPropertyId: input.event.listingPropertyId,
    overallQuality,
    score: numericScore(input.score),
    reasons,
    positiveEvidence,
    missingEvidence,
    conflicts,
    sourceCount,
    snapshotCount,
    fields,
    sourceQuality,
    sourceConsistency,
    evidenceChain: buildEvidenceChain({
      event: input.event,
      resolution: input.resolution,
    }),
    comparableEligible: input.resolution.comparableEligible,
    comparableRejectionCodes: input.resolution.comparableRejectionReasons,
    reviewPriority: priority,
    reviewRequired:
      overallQuality === "REVIEW_REQUIRED" ||
      overallQuality === "CONFLICT" ||
      priority != null,
  };
}
