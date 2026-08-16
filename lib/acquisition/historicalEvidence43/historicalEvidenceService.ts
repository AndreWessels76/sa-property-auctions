/**
 * HEA 4.3 acquisition orchestration (library — no server-only).
 */

import { resolveHistoricalEvent } from "@/lib/intelligence/historicalResolution";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { HistoricalEvidenceScore } from "@/lib/intelligence/historicalEvidence/types";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { discoverSourcesForEvent } from "./sourceDiscovery";
import { assessIdentityMatchStrength, identityReviewRequired } from "./identityResolver";
import {
  buildEvidenceObject,
  assessEvidenceQuality,
  evidenceSufficientForVerification,
} from "./evidenceValidator";
import { planSourceFetch, mapEnrichmentStatusToHea43State } from "./sourceFetcher";
import type {
  Hea43AcquireResult,
  Hea43AcquisitionState,
  Hea43EvidenceObject,
  Hea43SourceCandidate,
} from "./types";

export function mapToHea43State(input: {
  enrichmentStatus: string;
  resolutionState?: string | null;
  identityReviewRequired?: boolean;
  sourceFound?: boolean;
  dryRun?: boolean;
}): Hea43AcquisitionState {
  if (input.dryRun) return "UNRESOLVED";
  if (input.identityReviewRequired) return "REVIEW_REQUIRED";
  if (input.resolutionState === "VERIFIED") return "VERIFIED";
  if (input.resolutionState === "CONFLICT") return "CONFLICT";
  if (input.resolutionState === "REVIEW_REQUIRED") return "REVIEW_REQUIRED";
  if (input.resolutionState === "INSUFFICIENT_DATA") return "INSUFFICIENT_DATA";
  if (!input.sourceFound && input.enrichmentStatus === "SOURCE_UNAVAILABLE") {
    return "SOURCE_NOT_FOUND";
  }
  return mapEnrichmentStatusToHea43State(input.enrichmentStatus);
}

export function planAcquisition(input: {
  event: HistoricalEventObservation;
  dryRun: boolean;
  lastRunStatus?: string | null;
  hasOpenReview?: boolean;
  /** When live licence/public-fetch permission allows, clear sticky prior licence block. */
  allowLicenceRetry?: boolean;
}): {
  discovery: ReturnType<typeof discoverSourcesForEvent>;
  fetchPlan: ReturnType<typeof planSourceFetch>;
  identityReviewRequired: boolean;
} {
  const discovery = discoverSourcesForEvent({
    event: input.event,
    lastRunStatus: input.lastRunStatus,
    hasOpenReview: input.hasOpenReview,
    allowLicenceRetry: input.allowLicenceRetry,
  });
  const identity = assessIdentityMatchStrength(input.event);
  const fetchPlan = planSourceFetch({
    propertyId: input.event.listingPropertyId!,
    sourceUrl: input.event.sourceUrl,
    candidates: discovery.candidates,
    dryRun: input.dryRun,
    licensed: discovery.licensed,
  });

  return {
    discovery,
    fetchPlan,
    identityReviewRequired:
      identityReviewRequired(identity.strength) && !input.event.propertyMasterId,
  };
}

export function buildAcquireResult(input: {
  propertyId: string;
  auctionEventId: string | null;
  dryRun: boolean;
  enrichmentStatus?: string;
  outcome: string | null;
  salePrice: number | null;
  message: string;
  candidates: Hea43SourceCandidate[];
  evidence: Hea43EvidenceObject | null;
  event: HistoricalEventObservation;
  outcomeObs?: OutcomeObservationRow | null;
  openConflict?: boolean;
  openReview?: boolean;
  classification: OutcomeClassification;
  score: HistoricalEvidenceScore;
}): Hea43AcquireResult {
  const resolution = resolveHistoricalEvent({
    observation: input.event,
    classification: input.classification,
    score: input.score,
    outcomeObs: input.outcomeObs ?? null,
    sourceText: input.evidence?.evidenceText ?? null,
    openConflict: input.openConflict ?? false,
    openReview: input.openReview ?? false,
  });

  const identity = assessIdentityMatchStrength(input.event);
  const state = mapToHea43State({
    enrichmentStatus: input.enrichmentStatus ?? "UNRESOLVED",
    resolutionState: resolution.state,
    identityReviewRequired:
      identityReviewRequired(identity.strength) && !input.event.propertyMasterId,
    sourceFound: input.candidates.length > 0,
    dryRun: input.dryRun,
  });

  let finalState = state;
  if (
    !input.dryRun &&
    resolution.state === "VERIFIED" &&
    evidenceSufficientForVerification(assessEvidenceQuality(input.evidence))
  ) {
    finalState = "VERIFIED";
  } else if (!input.dryRun && resolution.state === "EXTRACTED") {
    finalState = "EXTRACTED";
  }

  return {
    ok:
      finalState === "VERIFIED" ||
      finalState === "EXTRACTED" ||
      finalState === "NO_CHANGE" ||
      (input.dryRun && input.candidates.length > 0),
    dryRun: input.dryRun,
    propertyId: input.propertyId,
    auctionEventId: input.auctionEventId,
    state: finalState,
    outcome: resolution.outcome,
    salePrice: resolution.salePrice,
    resolutionState: resolution.state,
    message: input.message,
    candidates: input.candidates,
    evidence: input.evidence,
  };
}

export function buildDryRunEvidence(
  event: HistoricalEventObservation,
  candidates: Hea43SourceCandidate[],
): Hea43EvidenceObject | null {
  if (candidates.length === 0) return null;
  return buildEvidenceObject({
    eventId: event.auctionEventId,
    propertyMasterId: event.propertyMasterId,
    listingPropertyId: event.listingPropertyId,
    sourceUrl: event.sourceUrl,
    sourceSnapshotId: null,
    sourceType: candidates[0]?.sourceType ?? null,
    evidenceText: null,
    extractedOutcome: null,
    extractedSalePrice: null,
    identityConfidence: assessIdentityMatchStrength(event).strength.toUpperCase(),
  });
}
