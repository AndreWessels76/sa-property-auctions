/**
 * HSA 4.9 — acquisition priority (P1–P4) from fetch diagnostics.
 * Reuses HEA queue semantics — does not create a new queue.
 */

import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import {
  classifyFetchFailure,
  isRetryableErrorCode,
  type ClassifiedFetchFailure,
} from "./fetchErrorClassification";
import { countAttemptsForProperty, evaluateRetry } from "./retryPolicy";
import type { Hsc48EventDiagnostic } from "./types";

export type Hsa49AcquisitionPriority = 1 | 2 | 3 | 4;

export type Hsa49PriorityAssignment = {
  priority: Hsa49AcquisitionPriority;
  reason: string;
  retryable: boolean;
  attempts: number;
  maxAttempts: number;
  failure: ClassifiedFetchFailure | null;
};

export function assignAcquisitionPriority(input: {
  event: Hsc48EventDiagnostic;
  enrichmentRuns: EnrichmentRunRow[];
}): Hsa49PriorityAssignment {
  const propertyId = input.event.listingPropertyId;
  const attempts = propertyId
    ? countAttemptsForProperty(propertyId, input.enrichmentRuns)
    : 0;

  const failure = input.event.fetchAttempted && !input.event.fetchSuccessful
    ? classifyFetchFailure({
        error:
          input.event.fetch?.networkError ??
          input.event.fetch?.tlsError ??
          input.event.fetch?.dnsError ??
          null,
        httpStatus: input.event.fetch?.httpStatus ?? null,
        enrichmentStatus: input.event.fetch?.enrichmentStatus ?? null,
        refetchStatus: input.event.fetch?.refetchStatus ?? null,
        contentLength: input.event.fetch?.contentLength ?? null,
        sourceUrl: input.event.source.sourceUrl,
      })
    : null;

  const retry = propertyId
    ? evaluateRetry({
        propertyId,
        enrichmentRuns: input.enrichmentRuns,
        error:
          input.event.fetch?.networkError ??
          input.event.fetch?.tlsError ??
          input.event.fetch?.dnsError ??
          null,
        httpStatus: input.event.fetch?.httpStatus ?? null,
        enrichmentStatus: input.event.fetch?.enrichmentStatus ?? null,
        refetchStatus: input.event.fetch?.refetchStatus ?? null,
      })
    : null;

  // P4 — permanent failure
  if (
    failure &&
    !isRetryableErrorCode(failure.errorCode) &&
    input.event.fetchAttempted
  ) {
    return {
      priority: 4,
      reason: `Permanent fetch failure: ${failure.errorCode}`,
      retryable: false,
      attempts,
      maxAttempts: retry?.maxAttempts ?? 3,
      failure,
    };
  }

  // P3 — source changed / manual inspection
  if (
    failure?.errorCode === "SOURCE_CHANGED" ||
    input.event.snapshot.sourceChanged === true
  ) {
    return {
      priority: 3,
      reason: "Source changed — requires manual inspection",
      retryable: false,
      attempts,
      maxAttempts: retry?.maxAttempts ?? 3,
      failure,
    };
  }

  // P2 — retryable failure with attempts remaining
  if (
    failure &&
    isRetryableErrorCode(failure.errorCode) &&
    retry?.shouldRetry
  ) {
    return {
      priority: 2,
      reason: retry.reason,
      retryable: true,
      attempts,
      maxAttempts: retry.maxAttempts,
      failure,
    };
  }

  // P1 — licensed source, never attempted or no snapshot/outcome
  if (
    !input.event.fetchAttempted ||
    (!input.event.snapshot.exists &&
      input.event.outcomeState === "UNKNOWN" &&
      input.event.salePriceState !== "VERIFIED")
  ) {
    return {
      priority: 1,
      reason: input.event.fetchAttempted
        ? "Licensed source — fetch attempted but no snapshot/outcome"
        : "Licensed source URL — fetch not attempted",
      retryable: true,
      attempts,
      maxAttempts: retry?.maxAttempts ?? 3,
      failure,
    };
  }

  return {
    priority: input.event.queuePriority ?? 4,
    reason: input.event.stoppingPoint,
    retryable: false,
    attempts,
    maxAttempts: retry?.maxAttempts ?? 3,
    failure,
  };
}

export function countByPriority(
  assignments: Hsa49PriorityAssignment[],
): Record<"p1" | "p2" | "p3" | "p4", number> {
  return {
    p1: assignments.filter((a) => a.priority === 1).length,
    p2: assignments.filter((a) => a.priority === 2).length,
    p3: assignments.filter((a) => a.priority === 3).length,
    p4: assignments.filter((a) => a.priority === 4).length,
  };
}
