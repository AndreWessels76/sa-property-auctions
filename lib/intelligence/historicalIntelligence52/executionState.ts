import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi52ExecutionState } from "./types";

export function deriveHi52ExecutionState(event: Hi50EventRow): {
  state: Hi52ExecutionState;
  reason: string;
} {
  if (event.resolution === "VERIFIED" || event.evidenceState === "VERIFIED") {
    return { state: "VERIFIED", reason: "Resolution VERIFIED with source evidence" };
  }
  if (event.evidenceState === "CONFLICT" || event.outcome === "CONFLICT") {
    return { state: "CONFLICT", reason: "Conflicting outcome or price evidence" };
  }
  if (
    event.resolution === "REVIEW_REQUIRED" ||
    event.evidenceState === "REVIEW_REQUIRED"
  ) {
    return { state: "REVIEW_REQUIRED", reason: "Admin review required" };
  }
  if (event.failureClassification === "LEGACY_UNKNOWN_FAILURE") {
    return {
      state: "LEGACY_UNKNOWN_FAILURE",
      reason: "Legacy failure without HTTP/error metadata — do not invent status",
    };
  }
  if (event.salePrice === "VERIFIED" || event.salePrice === "FOUND") {
    return { state: "SALE_PRICE_FOUND", reason: "Explicit sale price evidence present" };
  }
  if (event.outcome === "SOLD" || event.outcome === "FOUND" || event.evidenceState === "OUTCOME_FOUND") {
    return { state: "OUTCOME_FOUND", reason: "Explicit outcome evidence present" };
  }
  if (event.extraction === "SUCCESS" || event.extraction === "COMPLETE") {
    return { state: "EXTRACTION_COMPLETE", reason: "Extraction completed on snapshot" };
  }
  if (event.snapshot && (event.extraction === "NOT_RUN" || event.extraction === "FAILED")) {
    return {
      state: "MISSING_EXTRACTION",
      reason: "Valid snapshot exists — extract without refetch",
    };
  }
  if (event.snapshot) {
    return { state: "SNAPSHOT_AVAILABLE", reason: "Snapshot available for extraction" };
  }
  if (event.retryable && event.attemptNumber > 0) {
    return { state: "FETCH_RETRYABLE", reason: "Retryable fetch failure" };
  }
  if (event.recoveryPriority === 4 && event.attemptNumber > 0) {
    return { state: "FETCH_PERMANENT", reason: "Permanent fetch block / unavailable" };
  }
  if (
    event.evidenceState === "FETCH_SUCCESS" ||
    event.evidenceState === "SNAPSHOT_AVAILABLE"
  ) {
    return { state: "FETCH_SUCCESS", reason: "Fetch succeeded" };
  }
  if (
    event.evidenceState === "FETCH_HTTP_ERROR" ||
    event.evidenceState === "FETCH_NETWORK_ERROR" ||
    event.evidenceState === "FETCH_BLOCKED"
  ) {
    return { state: "FETCH_FAILED", reason: `Fetch failed — ${event.evidenceState}` };
  }
  if (event.attemptNumber > 0 || event.lastAttempt) {
    return { state: "FETCH_ATTEMPTED", reason: "Fetch attempted — awaiting classification" };
  }
  if (
    event.evidenceState === "FETCH_ELIGIBLE" ||
    event.evidenceState === "FETCH_NOT_ATTEMPTED" ||
    event.recoveryPriority === 1
  ) {
    return {
      state: "FETCH_ELIGIBLE_P1",
      reason: "Licensed source — fetch not attempted",
    };
  }
  return { state: "INSUFFICIENT_DATA", reason: "Insufficient evidence to classify" };
}

export function countExecutionStates(
  events: Hi50EventRow[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    const { state } = deriveHi52ExecutionState(event);
    counts[state] = (counts[state] ?? 0) + 1;
  }
  return counts;
}
