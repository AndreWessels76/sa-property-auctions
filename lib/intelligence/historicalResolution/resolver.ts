/**
 * Main historical evidence resolution orchestrator (HI 4.2).
 */

import { OUTCOME_EXTRACTION_VERSION } from "@/lib/acquisition/outcomes/types";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { HistoricalEvidenceScore } from "@/lib/intelligence/historicalEvidence/types";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { validateOutcomePriceAgreement } from "./agreementValidator";
import { assessIdentityConfidence } from "./identityResolver";
import { resolveOutcomeEvidence } from "./outcomeResolver";
import { resolveSalePriceEvidence } from "./salePriceResolver";
import { rankSourceEvidence } from "./sourcePriority";
import { assessComparableEligibility } from "./comparableEligibility";
import { HISTORICAL_RESOLUTION_VERSION } from "./config";
import type { HistoricalEventResolution, ResolutionState } from "./types";

function deriveResolutionState(input: {
  observation: HistoricalEventObservation;
  agreement: ReturnType<typeof validateOutcomePriceAgreement>;
  identityReviewRequired: boolean;
  hasExtraction: boolean;
  openConflict: boolean;
  openReview: boolean;
  evidenceQuality: HistoricalEvidenceScore["overallConfidence"];
}): ResolutionState {
  if (input.openConflict || input.agreement.agreement === "CONFLICT") return "CONFLICT";
  if (input.openReview || input.agreement.agreement === "REVIEW_REQUIRED") return "REVIEW_REQUIRED";
  if (!input.observation.sourceUrl?.trim()) {
    return input.hasExtraction ? "EXTRACTED" : "UNRESOLVED";
  }
  if (!input.hasExtraction) return "SOURCE_FOUND";
  if (input.identityReviewRequired) return "IDENTITY_PENDING";
  if (input.agreement.agreement === "VERIFIED" && input.evidenceQuality !== "INSUFFICIENT") {
    return "VERIFIED";
  }
  if (input.hasExtraction && input.agreement.agreement === "INSUFFICIENT") {
    return "INSUFFICIENT_DATA";
  }
  if (input.hasExtraction) return "EXTRACTED";
  return "UNRESOLVED";
}

export function resolveHistoricalEvent(input: {
  observation: HistoricalEventObservation;
  classification: OutcomeClassification;
  score: HistoricalEvidenceScore;
  outcomeObs?: OutcomeObservationRow | null;
  sourceText?: string | null;
  openConflict?: boolean;
  openReview?: boolean;
}): HistoricalEventResolution {
  const outcomeResult = resolveOutcomeEvidence({
    observation: input.observation,
    classification: input.classification,
    sourceText: input.sourceText,
  });
  const saleResult = resolveSalePriceEvidence({
    classification: input.classification,
    draft: outcomeResult.draft,
    sourceText: input.sourceText,
  });
  const agreement = validateOutcomePriceAgreement({
    classification: input.classification,
    draft: outcomeResult.draft,
  });
  const identity = assessIdentityConfidence(input.observation);
  const sourceTier = rankSourceEvidence({
    observation: input.observation,
    outcomeObs: input.outcomeObs,
  });

  const hasExtraction =
    Boolean(input.outcomeObs) ||
    outcomeResult.confirmed ||
    input.classification.confirmed;

  const state = deriveResolutionState({
    observation: input.observation,
    agreement,
    identityReviewRequired: identity.reviewRequired,
    hasExtraction,
    openConflict: input.openConflict === true,
    openReview: input.openReview === true,
    evidenceQuality: input.score.overallConfidence,
  });

  const selfComparable = assessComparableEligibility({
    subject: input.observation,
    candidate: input.observation,
    resolution: {
      observationId: input.observation.observationId,
      auctionEventId: input.observation.auctionEventId,
      propertyMasterId: input.observation.propertyMasterId,
      listingPropertyId: input.observation.listingPropertyId,
      state,
      label: agreement.label,
      outcome: outcomeResult.outcome,
      salePrice: saleResult.salePrice,
      salePriceSupplied: saleResult.supplied,
      agreement: agreement.agreement,
      evidenceQuality: input.score.overallConfidence,
      sourceTier,
      comparableEligible: false,
      comparableRejectionReasons: [],
      marketStatisticsEligible: false,
      identityReviewRequired: identity.reviewRequired,
      recommendedAction: null,
      provenance: {
        sourceUrl: input.observation.sourceUrl,
        sourceName: input.observation.sourceName,
        snapshotId: input.outcomeObs?.source_snapshot_id ?? null,
        sourceHash: input.outcomeObs?.source_hash ?? null,
        evidenceText: input.outcomeObs?.evidence_text ?? outcomeResult.draft?.evidence_text ?? null,
        parserVersion: input.outcomeObs?.calculation_version ?? OUTCOME_EXTRACTION_VERSION,
        fetchedAt: input.outcomeObs?.source_timestamp ?? null,
        extractedAt: input.outcomeObs?.observed_at ?? input.outcomeObs?.created_at ?? null,
      },
      conflicts: agreement.conflicts,
      acquisitionGaps: input.score.acquisitionGaps,
    },
  });

  let recommendedAction: string | null = null;
  if (state === "REVIEW_REQUIRED") recommendedAction = "Review evidence in admin resolution queue";
  else if (state === "IDENTITY_PENDING") recommendedAction = "Resolve identity before attaching evidence";
  else if (state === "SOURCE_FOUND") recommendedAction = "Run source refetch / enrichment";
  else if (agreement.label === "SOLD_WITHOUT_PRICE") {
    recommendedAction = "SOLD confirmed — sale price not supplied by source";
  }

  const comparableEligible =
    state === "VERIFIED" &&
    agreement.agreement === "VERIFIED" &&
    selfComparable.eligible;

  return {
    observationId: input.observation.observationId,
    auctionEventId: input.observation.auctionEventId,
    propertyMasterId: input.observation.propertyMasterId,
    listingPropertyId: input.observation.listingPropertyId,
    state,
    label: agreement.label,
    outcome: outcomeResult.outcome,
    salePrice: saleResult.salePrice,
    salePriceSupplied: saleResult.supplied,
    agreement: agreement.agreement,
    evidenceQuality: input.score.overallConfidence,
    sourceTier,
    comparableEligible,
    comparableRejectionReasons: selfComparable.reasons,
    marketStatisticsEligible: comparableEligible && input.score.marketStatisticsReady,
    identityReviewRequired: identity.reviewRequired,
    recommendedAction,
    provenance: {
      sourceUrl: input.observation.sourceUrl,
      sourceName: input.observation.sourceName,
      snapshotId: input.outcomeObs?.source_snapshot_id ?? null,
      sourceHash: input.outcomeObs?.source_hash ?? null,
      evidenceText: input.outcomeObs?.evidence_text ?? outcomeResult.draft?.evidence_text ?? null,
      parserVersion: input.outcomeObs?.calculation_version ?? OUTCOME_EXTRACTION_VERSION,
      fetchedAt: input.outcomeObs?.source_timestamp ?? null,
      extractedAt: input.outcomeObs?.observed_at ?? input.outcomeObs?.created_at ?? null,
    },
    conflicts: [...agreement.conflicts, ...saleResult.rejectedReasons],
    acquisitionGaps: input.score.acquisitionGaps,
  };
}

export function resolverVersion(): string {
  return HISTORICAL_RESOLUTION_VERSION;
}
