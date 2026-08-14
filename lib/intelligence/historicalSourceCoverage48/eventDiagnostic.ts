/**
 * Per-event diagnostic — determines where the evidence chain stops.
 */

import { discoverSourcesForEvent } from "@/lib/acquisition/historicalEvidence43/sourceDiscovery";
import type { Hea43QueueItem } from "@/lib/acquisition/historicalEvidence43/types";
import type { RefetchRunRow } from "@/lib/acquisition/refetch/refetchAudit";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import { resolveHistoricalEvent } from "@/lib/intelligence/historicalResolution/resolver";
import { buildSaleEvidence } from "@/lib/intelligence/comparables/saleEvidence";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { HistoricalEvidenceScore } from "@/lib/intelligence/historicalEvidence/types";
import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import type { PricingObservationRow } from "@/lib/repositories/PricingObservationRepository";
import {
  classifyFetchError,
  deriveRetryRecommendation,
  type Hsc48DiagnosticState,
  type Hsc48SourceStatus,
} from "./diagnosticStates";
import {
  buildFetchDiagnostic,
  isFetchFailed,
  isFetchSuccessful,
  latestEnrichmentRunForProperty,
  latestRefetchRunForProperty,
} from "./fetchDiagnostics";
import { acquisitionWouldReduceGap, gapCodesForDiagnostic } from "./gapMapping";
import { classifyFetchFailure } from "./fetchErrorClassification";
import { assignAcquisitionPriority } from "./acquisitionPriority49";
import { buildAcquisitionTimeline, deriveFetchState } from "./fetchStateMachine";
import { validateSnapshotContent } from "./snapshotValidation";
import { countAttemptsForProperty } from "./retryPolicy";
import type {
  Hsc48EventDiagnostic,
  Hsc48ExtractionState,
  Hsc48OutcomeState,
  Hsc48SalePriceState,
} from "./types";

function propertyLabel(event: HistoricalEventObservation): string {
  const parts = [event.suburb, event.town, event.farmName].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return event.observationId.slice(0, 8);
}

function mapSourceStatus(input: {
  sourceUrl: string | null;
  discovery: ReturnType<typeof discoverSourcesForEvent>;
  lastRunStatus: string | null;
}): Hsc48SourceStatus {
  if (input.discovery.identityReviewRequired) return "INELIGIBLE";
  if (input.discovery.resolution.status === "LICENSE_BLOCKED") return "LICENSE_BLOCKED";
  if (input.discovery.resolution.status === "ROBOTS_BLOCKED") return "LICENSE_BLOCKED";
  if (input.lastRunStatus === "SKIPPED_LICENSE") return "LICENSE_BLOCKED";
  if (!input.sourceUrl && !input.discovery.sourceFound) return "MISSING";
  if (input.discovery.sourceFound || input.sourceUrl) {
    return input.discovery.licensed ? "LICENSED" : "LICENSE_BLOCKED";
  }
  if (input.discovery.resolution.status === "SOURCE_UNAVAILABLE") return "UNAVAILABLE";
  return "FOUND";
}

function mapExtractionState(input: {
  enrichmentRun: EnrichmentRunRow | null;
  outcomeObs: OutcomeObservationRow | null;
  enrichmentStatus: string | null;
}): Hsc48ExtractionState {
  if (!input.enrichmentRun) return "NOT_RUN";
  const meta =
    input.enrichmentRun.meta && typeof input.enrichmentRun.meta === "object"
      ? (input.enrichmentRun.meta as Record<string, unknown>)
      : {};
  if (input.enrichmentStatus === "FAILED") return "FAILED";
  if (meta.extractionRunId || input.outcomeObs) {
    if (input.outcomeObs?.outcome || input.enrichmentRun.outcome) return "SUCCESS";
    return "NO_EVIDENCE";
  }
  if (
    input.enrichmentStatus === "COMPLETED" ||
    input.enrichmentStatus === "NO_CHANGE"
  ) {
    return input.outcomeObs ? "SUCCESS" : "NO_EVIDENCE";
  }
  return "NOT_RUN";
}

function mapOutcomeState(
  resolutionOutcome: string | null,
  openConflict: boolean,
  outcomeObs?: OutcomeObservationRow | null,
): Hsc48OutcomeState {
  if (openConflict) return "CONFLICT";
  const explicit = outcomeObs?.outcome ?? resolutionOutcome;
  if (!explicit || explicit === "UNKNOWN") return "UNKNOWN";
  const allowed = ["SOLD", "WITHDRAWN", "CANCELLED", "POSTPONED", "PASSED_IN"] as const;
  if ((allowed as readonly string[]).includes(explicit)) {
    return explicit as Hsc48OutcomeState;
  }
  return "UNKNOWN";
}

function mapSalePriceState(input: {
  outcome: Hsc48OutcomeState;
  sale: ReturnType<typeof buildSaleEvidence>;
  pricingObs: PricingObservationRow[];
}): Hsc48SalePriceState {
  if (input.outcome !== "SOLD" && input.outcome !== "UNKNOWN") {
    return "NOT_APPLICABLE";
  }
  const rejectedGuide = input.pricingObs.some(
    (p) => p.field_name === "guide_price" && p.status !== "verified",
  );
  const rejectedReserve = input.pricingObs.some(
    (p) => p.field_name === "reserve_price" && p.status !== "verified",
  );
  if (input.sale.verifiedSale && input.sale.salePrice != null) return "VERIFIED";
  if (input.outcome === "SOLD") return "SOLD_WITHOUT_PRICE";
  if (rejectedGuide) return "REJECTED_GUIDE";
  if (rejectedReserve) return "REJECTED_RESERVE";
  return "MISSING";
}

function derivePrimaryState(input: {
  sourceStatus: Hsc48SourceStatus;
  identityReviewRequired: boolean;
  conflictReviewRequired: boolean;
  fetchAttempted: boolean;
  fetchSuccessful: boolean;
  fetchFailed: boolean;
  fetchDiagnostic: ReturnType<typeof buildFetchDiagnostic>;
  enrichmentStatus: string | null;
  snapshotExists: boolean;
  noChange: boolean;
  extractionState: Hsc48ExtractionState;
  outcomeState: Hsc48OutcomeState;
  salePriceState: Hsc48SalePriceState;
  resolutionState: string;
}): Hsc48DiagnosticState {
  if (input.identityReviewRequired) return "IDENTITY_REVIEW_REQUIRED";
  if (input.conflictReviewRequired || input.outcomeState === "CONFLICT") {
    return "CONFLICT_REVIEW_REQUIRED";
  }

  if (input.sourceStatus === "MISSING") return "SOURCE_NOT_FOUND";
  if (input.sourceStatus === "LICENSE_BLOCKED") return "SOURCE_LICENSE_BLOCKED";
  if (input.sourceStatus === "INELIGIBLE") return "SOURCE_INELIGIBLE";

  if (!input.fetchAttempted) return "FETCH_NOT_ATTEMPTED";

  const fetchErr = classifyFetchError({
    enrichmentStatus: input.enrichmentStatus,
    refetchStatus: input.fetchDiagnostic?.refetchStatus ?? null,
    httpStatus: input.fetchDiagnostic?.httpStatus ?? null,
    error:
      input.fetchDiagnostic?.tlsError ??
      input.fetchDiagnostic?.networkError ??
      input.fetchDiagnostic?.dnsError ??
      null,
  });
  if (input.fetchFailed && fetchErr) return fetchErr;
  if (input.fetchFailed) return "FETCH_HTTP_ERROR";

  if (input.noChange || input.enrichmentStatus === "NO_CHANGE") return "NO_CHANGE";

  if (input.fetchSuccessful && !input.snapshotExists && !input.noChange) {
    return "SNAPSHOT_NOT_CREATED";
  }

  if (input.snapshotExists && input.extractionState === "NOT_RUN") {
    return "EXTRACTION_NOT_RUN";
  }
  if (input.extractionState === "FAILED") return "EXTRACTION_FAILED";
  if (input.extractionState === "NO_EVIDENCE") return "EXTRACTION_SUCCESS_NO_EVIDENCE";

  if (input.resolutionState === "INSUFFICIENT_DATA") return "INSUFFICIENT_DATA";
  if (input.outcomeState === "UNKNOWN") return "OUTCOME_NOT_FOUND";
  if (
    input.outcomeState === "SOLD" &&
    (input.salePriceState === "MISSING" || input.salePriceState === "SOLD_WITHOUT_PRICE")
  ) {
    return "SALE_PRICE_NOT_FOUND";
  }

  if (
    input.resolutionState === "VERIFIED" &&
    input.outcomeState === "SOLD" &&
    input.salePriceState === "VERIFIED"
  ) {
    return "READY_FOR_INTELLIGENCE";
  }

  if (input.snapshotExists) return "SNAPSHOT_CREATED";
  if (input.fetchSuccessful) return "FETCH_SUCCESS";
  return "INSUFFICIENT_DATA";
}

function stoppingPointLabel(state: Hsc48DiagnosticState): string {
  const map: Record<Hsc48DiagnosticState, string> = {
    SOURCE_NOT_FOUND: "No licensed source URL discovered",
    SOURCE_NOT_LICENSED: "Source not licensed for acquisition",
    SOURCE_LICENSE_BLOCKED: "License or robots policy blocked fetch",
    SOURCE_INELIGIBLE: "Source ineligible — weak identity match",
    FETCH_NOT_ATTEMPTED: "No enrichment fetch attempted yet",
    FETCH_NETWORK_ERROR: "Network error during fetch",
    FETCH_TLS_ERROR: "TLS/certificate error during fetch",
    FETCH_DNS_ERROR: "DNS resolution failed",
    FETCH_TIMEOUT: "Fetch timed out",
    FETCH_HTTP_ERROR: "HTTP error response",
    FETCH_HTTP_403: "HTTP 403 Forbidden",
    FETCH_HTTP_404: "HTTP 404 Not Found",
    FETCH_HTTP_429: "HTTP 429 Rate Limited",
    FETCH_HTTP_5XX: "HTTP 5xx server error",
    FETCH_REDIRECT_ERROR: "Redirect loop or invalid redirect",
    FETCH_SUCCESS_NO_CONTENT: "Fetch succeeded but no content received",
    FETCH_SUCCESS: "Fetch succeeded",
    SNAPSHOT_NOT_CREATED: "Fetch completed but snapshot not persisted",
    SNAPSHOT_CREATED: "Snapshot persisted — awaiting extraction outcome",
    NO_CHANGE: "Content unchanged (same SHA-256) — no duplicate work",
    EXTRACTION_NOT_RUN: "Snapshot exists but extraction not executed",
    EXTRACTION_COMPLETED: "Extraction completed",
    EXTRACTION_FAILED: "Extraction pipeline failed",
    EXTRACTION_SUCCESS_NO_EVIDENCE: "Extraction ran — no explicit outcome in source",
    OUTCOME_NOT_FOUND: "No verified outcome evidence",
    SALE_PRICE_NOT_FOUND: "Outcome present but no verified sale price",
    IDENTITY_REVIEW_REQUIRED: "Identity depends on town+agency only",
    CONFLICT_REVIEW_REQUIRED: "Conflicting evidence requires admin review",
    INSUFFICIENT_DATA: "Evidence quality insufficient for resolution",
    READY_FOR_INTELLIGENCE: "Evidence chain complete for intelligence",
  };
  return map[state] ?? state;
}

export function buildEventDiagnostic(input: {
  event: HistoricalEventObservation;
  classification: OutcomeClassification;
  score: HistoricalEvidenceScore;
  enrichmentRuns: EnrichmentRunRow[];
  refetchRuns: RefetchRunRow[];
  outcomeObs: OutcomeObservationRow | null;
  pricingObs: PricingObservationRow[];
  queueItem: Hea43QueueItem | null;
  openReview: boolean;
  openConflict: boolean;
}): Hsc48EventDiagnostic {
  const enrichmentRun = latestEnrichmentRunForProperty(
    input.event.listingPropertyId,
    input.enrichmentRuns,
  );
  const refetchRun = latestRefetchRunForProperty(
    input.event.listingPropertyId,
    input.refetchRuns,
  );
  const enrichmentStatus = enrichmentRun?.status ?? null;

  const discovery = discoverSourcesForEvent({
    event: input.event,
    lastRunStatus: enrichmentStatus,
    hasOpenReview: input.openReview,
  });

  const sourceStatus = mapSourceStatus({
    sourceUrl: input.event.sourceUrl,
    discovery,
    lastRunStatus: enrichmentStatus,
  });

  const fetchDiagnostic = buildFetchDiagnostic({
    eventId: input.event.auctionEventId,
    propertyMasterId: input.event.propertyMasterId,
    listingPropertyId: input.event.listingPropertyId,
    sourceUrl: input.event.sourceUrl,
    agency: input.event.agency,
    enrichmentRun,
    refetchRun,
  });

  const fetchAttempted = Boolean(enrichmentRun);
  const fetchSuccessful = isFetchSuccessful({
    enrichmentStatus,
    refetchStatus: fetchDiagnostic?.refetchStatus ?? null,
  });
  const fetchFailed = isFetchFailed({
    enrichmentStatus,
    refetchStatus: fetchDiagnostic?.refetchStatus ?? null,
    fetchDiagnostic,
  });

  const noChange = enrichmentStatus === "NO_CHANGE";
  const snapshotExists = Boolean(
    enrichmentRun?.snapshot_id ||
      enrichmentRun?.source_hash ||
      noChange,
  );

  const extractionState = mapExtractionState({
    enrichmentRun,
    outcomeObs: input.outcomeObs,
    enrichmentStatus,
  });

  const resolution = resolveHistoricalEvent({
    observation: input.event,
    classification: input.classification,
    score: input.score,
    outcomeObs: input.outcomeObs,
    openConflict: input.openConflict,
    openReview: input.openReview,
  });

  const sale = buildSaleEvidence(input.event, input.pricingObs);
  const outcomeState = mapOutcomeState(resolution.outcome, input.openConflict, input.outcomeObs);
  const salePriceState = mapSalePriceState({
    outcome: outcomeState,
    sale,
    pricingObs: input.pricingObs,
  });

  const identityReviewRequired =
    resolution.identityReviewRequired || discovery.identityReviewRequired;

  const primaryState = derivePrimaryState({
    sourceStatus,
    identityReviewRequired,
    conflictReviewRequired: input.openConflict || input.openReview,
    fetchAttempted,
    fetchSuccessful,
    fetchFailed,
    fetchDiagnostic,
    enrichmentStatus,
    snapshotExists,
    noChange,
    extractionState,
    outcomeState,
    salePriceState,
    resolutionState: resolution.state,
  });

  const retryRecommendation = deriveRetryRecommendation(primaryState);
  const mappedGapCodes = gapCodesForDiagnostic(primaryState);

  const meta =
    enrichmentRun?.meta && typeof enrichmentRun.meta === "object"
      ? (enrichmentRun.meta as Record<string, unknown>)
      : {};

  const topCandidate = discovery.candidates[0];

  const attemptNumber = input.event.listingPropertyId
    ? countAttemptsForProperty(input.event.listingPropertyId, input.enrichmentRuns)
    : 0;

  const fetchError =
    fetchAttempted && !fetchSuccessful
      ? classifyFetchFailure({
          error:
            fetchDiagnostic?.tlsError ??
            fetchDiagnostic?.dnsError ??
            fetchDiagnostic?.networkError ??
            null,
          httpStatus: fetchDiagnostic?.httpStatus ?? null,
          enrichmentStatus,
          refetchStatus: fetchDiagnostic?.refetchStatus ?? null,
          contentLength: fetchDiagnostic?.contentLength ?? null,
          sourceUrl: input.event.sourceUrl,
        })
      : null;

  const sourceChanged = Boolean(
    refetchRun?.changed &&
      refetchRun.previous_hash &&
      refetchRun.content_hash &&
      refetchRun.previous_hash !== refetchRun.content_hash,
  );

  const snapshotValidation =
    snapshotExists && fetchSuccessful
      ? validateSnapshotContent({
          contentLength: fetchDiagnostic?.contentLength ?? null,
          httpStatus: fetchDiagnostic?.httpStatus ?? null,
          sourceUrl: input.event.sourceUrl,
          finalUrl: fetchDiagnostic?.finalUrl ?? null,
        })
      : null;

  const baseDiagnostic: Hsc48EventDiagnostic = {
    observationId: input.event.observationId,
    auctionEventId: input.event.auctionEventId,
    propertyMasterId: input.event.propertyMasterId,
    listingPropertyId: input.event.listingPropertyId,
    propertyLabel: propertyLabel(input.event),
    agency: input.event.agency ?? input.event.sourceName,
    town: input.event.town,
    auctionDate: input.event.auctionDate,
    queuePriority: input.queueItem?.priority ?? null,
    queueReason: input.queueItem?.reason ?? null,
    source: {
      sourceId: topCandidate?.connector ?? null,
      sourceName: input.event.sourceName,
      agency: input.event.agency,
      sourceUrl: input.event.sourceUrl ?? topCandidate?.sourceUrl ?? null,
      sourceTier: topCandidate?.sourceType ?? null,
      discoveredAt: null,
      lastCheckedAt: enrichmentRun?.completed_at ?? enrichmentRun?.started_at ?? null,
      sourceStatus,
    },
    fetch: fetchDiagnostic
      ? {
          ...fetchDiagnostic,
          errorCode: fetchError?.errorCode ?? null,
          retryable: fetchError?.retryable ?? false,
          attemptNumber,
          snapshotId: enrichmentRun?.snapshot_id ?? null,
        }
      : null,
    fetchAttempted,
    fetchSuccessful,
    snapshot: {
      exists: snapshotExists,
      snapshotId: enrichmentRun?.snapshot_id ?? null,
      sha256: enrichmentRun?.source_hash ?? refetchRun?.content_hash ?? null,
      observedAt: enrichmentRun?.completed_at ?? refetchRun?.completed_at ?? null,
      sourceUrl: enrichmentRun?.source_url ?? input.event.sourceUrl,
      contentLength: fetchDiagnostic?.contentLength ?? null,
      version: null,
      extractionLinked: Boolean(meta.extractionRunId),
      noChange,
      valid: snapshotValidation?.valid ?? (snapshotExists ? true : null),
      validationReason: snapshotValidation?.reason ?? null,
      sourceChanged,
    },
    extraction: {
      state: extractionState,
      extractionRunId: (meta.extractionRunId as string | undefined) ?? null,
      extractionVersion: null,
      fieldsExtracted: 0,
      outcomeExtracted: Boolean(input.outcomeObs?.outcome ?? enrichmentRun?.outcome),
      salePriceExtracted: Boolean(input.outcomeObs?.sale_price ?? enrichmentRun?.sale_price),
      sizeExtracted: Boolean(input.event.floorSizeM2 ?? input.event.hectares),
      identitySignals: discovery.candidates.flatMap((c) => c.notes).slice(0, 5),
      confidence: input.score.overallConfidence,
    },
    outcomeState,
    salePriceState,
    evidenceQuality: input.score.overallConfidence,
    resolutionState: resolution.state,
    primaryState,
    retryRecommendation,
    mappedGapCodes,
    acquisitionWouldReduceGap: acquisitionWouldReduceGap(primaryState),
    nextAction: retryRecommendation.replace(/_/g, " "),
    stoppingPoint: stoppingPointLabel(primaryState),
  };

  const acquisitionPriority = assignAcquisitionPriority({
    event: baseDiagnostic,
    enrichmentRuns: input.enrichmentRuns,
  });

  return {
    ...baseDiagnostic,
    fetchError,
    fetchState: deriveFetchState({
      event: baseDiagnostic,
      errorCode: fetchError?.errorCode,
    }),
    acquisitionTimeline: buildAcquisitionTimeline(
      baseDiagnostic,
      fetchError?.errorCode,
    ),
    acquisitionPriority,
  };
}
