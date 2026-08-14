/**
 * Compose HI 5.0 intelligence report from HSC 4.8 diagnostic report.
 */

import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import type { Hsc48DiagnosticReport, Hsc48EventDiagnostic } from "@/lib/intelligence/historicalSourceCoverage48/types";
import { latestEnrichmentRunForProperty } from "@/lib/intelligence/historicalSourceCoverage48/fetchDiagnostics";
import { HISTORICAL_INTELLIGENCE50_VERSION } from "./config";
import { deriveHi50EvidenceState, stateBreakdownHi50 } from "./evidenceStates";
import { classifyFailureMetadata, countLegacyFailures } from "./legacyFailure";
import {
  assignRecoveryPriority,
  countRecoveryPriority,
} from "./recoveryPriority";
import { computeSuccessRates } from "./successRates";
import { detectBottleneck } from "./bottleneck";
import type {
  Hi50CoverageDashboard,
  Hi50EventRow,
  Hi50GapEntry,
  Hi50IntelligenceReport,
  Hi50ProductionVerdict,
} from "./types";

function gapGroupForEvent(input: {
  recoveryPriority: number;
  evidenceState: string;
  resolutionState: string | null;
}): Hi50GapEntry["group"] {
  if (input.resolutionState === "VERIFIED" || input.evidenceState === "VERIFIED") {
    return "VERIFIED";
  }
  if (input.evidenceState === "REVIEW_REQUIRED" || input.evidenceState === "CONFLICT") {
    return "REVIEW_REQUIRED";
  }
  if (input.recoveryPriority === 1) return "P1";
  if (input.recoveryPriority === 2) return "P2";
  if (input.recoveryPriority === 3) return "P3";
  return "P4";
}

function buildEventRow(
  event: Hsc48EventDiagnostic,
  enrichmentRuns: EnrichmentRunRow[],
): Hi50EventRow {
  const enrichmentRun = latestEnrichmentRunForProperty(
    event.listingPropertyId,
    enrichmentRuns,
  );
  const recovery = assignRecoveryPriority(event);
  const evidenceState = deriveHi50EvidenceState(event);
  const failureClassification = classifyFailureMetadata({
    enrichmentRun,
    fetchAttempted: event.fetchAttempted,
    fetchSuccessful: event.fetchSuccessful,
    errorCode: event.fetchError?.errorCode ?? event.fetch?.errorCode ?? null,
    httpStatus: event.fetch?.httpStatus ?? null,
  });

  return {
    observationId: event.observationId,
    auctionEventId: event.auctionEventId,
    propertyLabel: event.propertyLabel,
    town: event.town,
    agency: event.agency,
    auctionDate: event.auctionDate,
    sourceUrl: event.source.sourceUrl,
    sourceStatus: event.source.sourceStatus,
    recoveryPriority: recovery.priority,
    evidenceState,
    fetchState: event.fetchState ?? null,
    httpStatus: event.fetch?.httpStatus ?? null,
    errorCode: event.fetchError?.errorCode ?? event.fetch?.errorCode ?? null,
    failureClassification,
    retryable: event.fetchError?.retryable ?? false,
    snapshot: event.snapshot.exists,
    extraction: event.extraction.state,
    outcome: event.outcomeState,
    salePrice: event.salePriceState,
    resolution: event.resolutionState,
    evidenceQuality: event.evidenceQuality,
    lastAttempt: event.fetch?.attemptTimestamp ?? null,
    attemptNumber: event.fetch?.attemptNumber ?? event.acquisitionPriority?.attempts ?? 0,
    nextAction: recovery.nextAction,
  };
}

function buildCoverageDashboard(
  report: Hsc48DiagnosticReport,
  eventRows: Hi50EventRow[],
  legacyFailuresRequiringRefetch: number,
): Hi50CoverageDashboard {
  const total = report.coverage.total;
  return {
    historicalEvents: total,
    licensedSources: `${report.coverage.sourceLicensed}/${total}`,
    fetchAttempted: `${report.metrics.fetchAttempted}/${total}`,
    neverAttempted: eventRows.filter(
      (e) =>
        e.evidenceState === "FETCH_ELIGIBLE" ||
        e.evidenceState === "FETCH_NOT_ATTEMPTED",
    ).length,
    fetchSuccessful: report.metrics.successfulFetches,
    fetchFailed: report.metrics.failedFetches,
    legacyFailuresRequiringRefetch,
    snapshots: report.metrics.snapshots,
    extractions: report.metrics.extractionAttempted,
    outcomeEvidence: report.coverage.outcomeEvidence,
    verifiedSold: report.metrics.verifiedSold,
    soldWithoutPrice: report.metrics.soldWithoutPrice,
    verifiedSalePrices: report.metrics.verifiedSalePrices,
    comparableReady: report.metrics.comparableReady,
    marketReadyTowns: report.metrics.marketReadyTowns,
    conflicts: report.metrics.conflicts,
    reviewRequired: report.metrics.reviewRequired,
    catalogueLeaks: report.metrics.catalogueLeaks,
  };
}

export function deriveHi50Verdict(input: {
  liveDataUnavailable: boolean;
  catalogueLeaks: number;
  metrics: Hsc48DiagnosticReport["metrics"];
}): { verdict: Hi50ProductionVerdict; reason: string } {
  if (input.liveDataUnavailable) {
    return {
      verdict: "PRODUCTION BLOCKED",
      reason: "LIVE_DATA_UNAVAILABLE — connectivity prevents validation",
    };
  }
  if (input.catalogueLeaks > 0) {
    return {
      verdict: "PRODUCTION BLOCKED",
      reason: `${input.catalogueLeaks} catalogue leak(s) detected`,
    };
  }
  if (input.metrics.verifiedSalePrices > 0 && input.metrics.verifiedSold > 0) {
    return {
      verdict: "PRODUCTION READY",
      reason: "Verified sale evidence present in production",
    };
  }
  return {
    verdict: "INSUFFICIENT DATA — ENGINE READY",
    reason:
      "Evidence recovery engine operational — verified sale outcomes and prices remain missing from licensed sources",
  };
}

export function buildHi50Report(input: {
  hscReport: Hsc48DiagnosticReport;
  enrichmentRuns: EnrichmentRunRow[];
}): Hi50IntelligenceReport {
  const eventRows = input.hscReport.events.map((e) =>
    buildEventRow(e, input.enrichmentRuns),
  );
  const recoveryAssignments = input.hscReport.events.map(assignRecoveryPriority);
  const gapEntries: Hi50GapEntry[] = eventRows.map((row) => ({
    eventId: row.auctionEventId ?? row.observationId,
    property: row.propertyLabel,
    town: row.town,
    source: row.sourceUrl,
    currentState: row.evidenceState,
    lastAttempt: row.lastAttempt,
    failure:
      row.failureClassification === "LEGACY_UNKNOWN_FAILURE"
        ? "LEGACY_UNKNOWN_FAILURE"
        : row.errorCode,
    nextAction: row.nextAction,
    priority: row.recoveryPriority,
    group: gapGroupForEvent({
      recoveryPriority: row.recoveryPriority,
      evidenceState: row.evidenceState,
      resolutionState: row.resolution,
    }),
  }));

  const legacyFailuresRequiringRefetch = countLegacyFailures(
    input.hscReport.events.map((event) => {
      const enrichmentRun = latestEnrichmentRunForProperty(
        event.listingPropertyId,
        input.enrichmentRuns,
      );
      return {
        fetchAttempted: event.fetchAttempted,
        fetchSuccessful: event.fetchSuccessful,
        failureClassification: classifyFailureMetadata({
          enrichmentRun,
          fetchAttempted: event.fetchAttempted,
          fetchSuccessful: event.fetchSuccessful,
          errorCode: event.fetchError?.errorCode ?? null,
          httpStatus: event.fetch?.httpStatus ?? null,
        }),
      };
    }),
  );

  const verdictBlock = deriveHi50Verdict({
    liveDataUnavailable: input.hscReport.liveDataUnavailable,
    catalogueLeaks: input.hscReport.metrics.catalogueLeaks,
    metrics: input.hscReport.metrics,
  });

  return {
    version: HISTORICAL_INTELLIGENCE50_VERSION,
    generatedAt: new Date().toISOString(),
    connectivity: input.hscReport.connectivity,
    metrics: input.hscReport.metrics,
    coverage: input.hscReport.coverage,
    coverageDashboard: buildCoverageDashboard(
      input.hscReport,
      eventRows,
      legacyFailuresRequiringRefetch,
    ),
    stateBreakdown: stateBreakdownHi50(input.hscReport.events),
    recoveryPriorityCounts: countRecoveryPriority(recoveryAssignments),
    successRates: computeSuccessRates(input.hscReport.metrics, input.hscReport.coverage),
    bottleneck: detectBottleneck(input.hscReport.events),
    events: eventRows,
    gapEntries,
    verdict: verdictBlock.verdict,
    reason: verdictBlock.reason,
    liveDataUnavailable: input.hscReport.liveDataUnavailable,
  };
}
