/**
 * HI 5.0 recovery priority — extends HSA queue semantics, no new queue.
 */

import type { Hsc48EventDiagnostic } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { Hi50RecoveryAssignment, Hi50RecoveryPriority } from "./types";

export function assignRecoveryPriority(event: Hsc48EventDiagnostic): Hi50RecoveryAssignment {
  // P4 — permanently blocked / unavailable
  if (
    event.acquisitionPriority?.priority === 4 ||
    event.source.sourceStatus === "LICENSE_BLOCKED" ||
    event.primaryState === "SOURCE_LICENSE_BLOCKED" ||
    (event.fetchError && !event.fetchError.retryable && event.fetchAttempted && !event.fetchSuccessful)
  ) {
    return {
      priority: 4,
      reason: event.acquisitionPriority?.reason ?? "Permanently blocked or unavailable source",
      nextAction: "REVIEW SOURCE",
    };
  }

  // P3 — snapshot exists but extraction incomplete
  if (
    event.snapshot.exists &&
    (event.extraction.state === "NOT_RUN" || event.primaryState === "EXTRACTION_NOT_RUN")
  ) {
    return {
      priority: 3,
      reason: "Snapshot available — re-run extraction before refetch",
      nextAction: "EXTRACT SNAPSHOT",
    };
  }

  // P2 — retryable fetch failure
  if (
    event.fetchAttempted &&
    !event.fetchSuccessful &&
    event.fetchError?.retryable
  ) {
    return {
      priority: 2,
      reason: event.fetchError.errorCode,
      nextAction: "RETRY FETCH",
    };
  }

  // P1 — never attempted or eligible first fetch
  if (!event.fetchAttempted || event.primaryState === "FETCH_NOT_ATTEMPTED") {
    return {
      priority: 1,
      reason: "Licensed source — fetch not attempted",
      nextAction: "ACQUIRE",
    };
  }

  const fallback: Hi50RecoveryPriority = event.acquisitionPriority?.priority ?? 4;
  return {
    priority: fallback <= 3 ? fallback : 4,
    reason: event.stoppingPoint,
    nextAction: event.retryRecommendation,
  };
}

export function countRecoveryPriority(
  assignments: Hi50RecoveryAssignment[],
): Record<"p1" | "p2" | "p3" | "p4", number> {
  return {
    p1: assignments.filter((a) => a.priority === 1).length,
    p2: assignments.filter((a) => a.priority === 2).length,
    p3: assignments.filter((a) => a.priority === 3).length,
    p4: assignments.filter((a) => a.priority === 4).length,
  };
}

export function isEligibleForSnapshotExtraction(event: Hsc48EventDiagnostic): boolean {
  return (
    Boolean(event.listingPropertyId) &&
    event.snapshot.exists &&
    event.extraction.state === "NOT_RUN"
  );
}

export function filterSnapshotExtractionCandidates(
  events: Hsc48EventDiagnostic[],
): Hsc48EventDiagnostic[] {
  return events.filter(isEligibleForSnapshotExtraction);
}
