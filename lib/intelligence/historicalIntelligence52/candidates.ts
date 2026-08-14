import type { Hi51IntelligenceReport, Hi51RecoverySnapshot } from "@/lib/intelligence/historicalIntelligence51";
import type { Hi52BatchDeltaReport, Hi52CoverageDashboard, Hi52DryRunCandidate } from "./types";
import { deriveHi52ExecutionState } from "./executionState";
import {
  filterLegacyEligible,
  filterMissingExtraction,
  filterP1Eligible,
} from "./stages";
import { HI52_DEFAULT_BATCH_LIMIT, HI52_MAX_BATCH_LIMIT } from "./config";

export function buildCoverage52(report: Hi51IntelligenceReport): Hi52CoverageDashboard {
  const total = report.coverageDashboard.historicalEvents;
  return {
    historicalEvents: total,
    licensedSources: String(report.coverageDashboard.licensedSources),
    fetchAttempted: String(report.coverageDashboard.fetchAttempted),
    neverAttempted: Number(report.coverageDashboard.neverAttempted ?? 0),
    fetchSuccessful: Number(report.coverageDashboard.fetchSuccessful ?? 0),
    fetchFailed: Number(report.coverageDashboard.fetchFailed ?? 0),
    retryable: report.fetchResults.retryable,
    permanent: report.fetchResults.permanent,
    legacyFailures: Number(report.coverageDashboard.legacyFailuresRequiringRefetch ?? report.fetchResults.legacy),
    snapshots: `${report.coverageDashboard.snapshots}/${total}`,
    missingExtraction: report.missingExtractionCandidates,
    extractions: `${report.coverageDashboard.extractions}/${total}`,
    outcomeEvidence: `${report.coverageDashboard.outcomeEvidence}/${total}`,
    verifiedSold: Number(report.coverageDashboard.verifiedSold ?? 0),
    soldWithoutPrice: Number(report.coverageDashboard.soldWithoutPrice ?? 0),
    verifiedSalePrices: Number(report.coverageDashboard.verifiedSalePrices ?? 0),
    comparableReady: Number(report.coverageDashboard.comparableReady ?? 0),
    marketReadyTowns: Number(report.coverageDashboard.marketReadyTowns ?? 0),
    catalogueLeaks: Number(report.coverageDashboard.catalogueLeaks ?? 0),
  };
}

export function clampBatchLimit(limit?: number): number {
  const n = limit ?? HI52_DEFAULT_BATCH_LIMIT;
  return Math.min(Math.max(n, 1), HI52_MAX_BATCH_LIMIT);
}

export function buildP1DryRunCandidates(
  events: Hi51IntelligenceReport["events"],
  limit?: number,
): Hi52DryRunCandidate[] {
  const capped = clampBatchLimit(limit);
  return filterP1Eligible(events)
    .slice(0, capped)
    .map((e) => {
      const { state, reason } = deriveHi52ExecutionState(e);
      return {
        eventId: e.auctionEventId,
        observationId: e.observationId,
        propertyMasterId: null,
        propertyLabel: e.propertyLabel,
        town: e.town,
        agency: e.agency,
        source: e.sourceStatus,
        sourceUrl: e.sourceUrl,
        stage: "A_P1" as const,
        executionState: state,
        priority: e.recoveryPriority,
        currentState: e.evidenceState,
        lastAttempt: e.lastAttempt,
        expectedAction: "Acquire — first licensed source fetch",
        reason,
      };
    });
}

export function buildLegacyDryRunCandidates52(
  events: Hi51IntelligenceReport["events"],
  limit?: number,
): Hi52DryRunCandidate[] {
  const capped = clampBatchLimit(limit);
  return filterLegacyEligible(events)
    .slice(0, capped)
    .map((e) => {
      const { state, reason } = deriveHi52ExecutionState(e);
      return {
        eventId: e.auctionEventId,
        observationId: e.observationId,
        propertyMasterId: null,
        propertyLabel: e.propertyLabel,
        town: e.town,
        agency: e.agency,
        source: e.sourceStatus,
        sourceUrl: e.sourceUrl,
        stage: "B_LEGACY" as const,
        executionState: state,
        priority: e.recoveryPriority,
        currentState: e.evidenceState,
        lastAttempt: e.lastAttempt,
        expectedAction: "Retry legacy failure — write modern fetch metadata",
        reason,
      };
    });
}

export function buildExtractionDryRunCandidates(
  events: Hi51IntelligenceReport["events"],
  limit?: number,
): Hi52DryRunCandidate[] {
  const capped = clampBatchLimit(limit);
  return filterMissingExtraction(events)
    .slice(0, capped)
    .map((e) => {
      const { state, reason } = deriveHi52ExecutionState(e);
      return {
        eventId: e.auctionEventId,
        observationId: e.observationId,
        propertyMasterId: null,
        propertyLabel: e.propertyLabel,
        town: e.town,
        agency: e.agency,
        source: e.sourceStatus,
        sourceUrl: e.sourceUrl,
        stage: "C_EXTRACTION" as const,
        executionState: state,
        priority: e.recoveryPriority,
        currentState: e.evidenceState,
        lastAttempt: e.lastAttempt,
        expectedAction: "Extract existing snapshot — no refetch",
        reason,
      };
    });
}

export function buildBatchDeltaReport(input: {
  before: Hi51RecoverySnapshot;
  after: Hi51RecoverySnapshot;
  candidates: number;
  attempted: number;
  successful?: number;
  failed?: number;
  retryable?: number;
  permanent?: number;
  lines: string[];
  improved: boolean;
}): Hi52BatchDeltaReport {
  return {
    candidates: input.candidates,
    attempted: input.attempted,
    successful: input.successful ?? Math.max(0, input.after.fetchSuccessful - input.before.fetchSuccessful),
    failed: input.failed ?? Math.max(0, input.after.fetchFailed - input.before.fetchFailed),
    retryable: input.retryable ?? 0,
    permanent: input.permanent ?? 0,
    before: input.before,
    after: input.after,
    lines: input.lines,
    improved: input.improved,
  };
}
