import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi55RecoveryLanes } from "./types";

/**
 * Keep never-attempted separate from legacy unknown failures.
 * Do not mix FETCH_NOT_ATTEMPTED with LEGACY_UNKNOWN_FAILURE.
 */
export function buildRecoveryLanes55(events: Hi50EventRow[]): Hi55RecoveryLanes {
  const neverAttempted = events.filter((e) => e.attemptNumber <= 0).length;
  const legacyUnknownFailures = events.filter(
    (e) => e.failureClassification === "LEGACY_UNKNOWN_FAILURE",
  ).length;
  const retryableFailures = events.filter(
    (e) => e.attemptNumber > 0 && e.retryable && e.failureClassification !== "LEGACY_UNKNOWN_FAILURE",
  ).length;
  const snapshotExtractionPending = events.filter(
    (e) =>
      e.snapshot === true &&
      (e.extraction === "NOT_RUN" ||
        e.extraction === "MISSING" ||
        e.extraction === "INCOMPLETE"),
  ).length;

  return {
    neverAttempted,
    legacyUnknownFailures,
    retryableFailures,
    snapshotExtractionPending,
    note: "P1 never-attempted and legacy unknown failures are separate recovery lanes",
  };
}
