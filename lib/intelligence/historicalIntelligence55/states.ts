import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi55EventState } from "./types";

/**
 * Map existing HI50 evidence rows to HI 5.5 campaign states.
 * Does not invent contradictory states — prefers explicit evidence fields.
 */
export function deriveHi55EventState(event: Hi50EventRow): Hi55EventState {
  if (event.evidenceState === "CONFLICT" || event.resolution === "CONFLICT") {
    return "CONFLICT";
  }
  if (
    event.evidenceState === "REVIEW_REQUIRED" ||
    event.resolution === "REVIEW_REQUIRED"
  ) {
    return "REVIEW_REQUIRED";
  }
  if (event.failureClassification === "LEGACY_UNKNOWN_FAILURE") {
    return "LEGACY_UNKNOWN_FAILURE";
  }
  if (event.salePrice === "VERIFIED" && event.outcome === "SOLD") {
    return "PRICE_VERIFIED";
  }
  if (event.outcome === "SOLD" && event.salePrice === "VERIFIED") {
    return "VERIFIED_SOLD";
  }
  if (event.outcome === "SOLD" && event.salePrice !== "VERIFIED") {
    return "SOLD_WITHOUT_PRICE";
  }
  if (event.outcome === "SOLD" || event.evidenceState === "OUTCOME_FOUND") {
    return "OUTCOME_OBSERVED";
  }
  if (
    event.extraction === "COMPLETE" ||
    event.extraction === "SUCCESS" ||
    event.evidenceState === "EXTRACTION_AVAILABLE"
  ) {
    return "EXTRACTED";
  }
  if (
    event.snapshot &&
    (event.extraction === "NOT_RUN" ||
      event.extraction === "MISSING" ||
      event.extraction === "INCOMPLETE")
  ) {
    return "EXTRACTION_REQUIRED";
  }
  if (event.snapshot || event.evidenceState === "SNAPSHOT_AVAILABLE") {
    return "SNAPSHOT_AVAILABLE";
  }
  if (
    event.evidenceState === "FETCH_SUCCESS" ||
    (event.attemptNumber > 0 && !event.retryable && event.httpStatus != null && event.httpStatus < 400)
  ) {
    return "FETCH_SUCCESS";
  }
  if (
    event.evidenceState === "FETCH_HTTP_ERROR" ||
    event.evidenceState === "FETCH_NETWORK_ERROR" ||
    event.evidenceState === "FETCH_BLOCKED" ||
    (event.attemptNumber > 0 && event.retryable)
  ) {
    return "FETCH_FAILED";
  }
  if (event.evidenceState === "FETCH_IN_PROGRESS") {
    return "FETCH_IN_PROGRESS";
  }
  if (event.attemptNumber <= 0) {
    return event.recoveryPriority === 1 ? "FETCH_ELIGIBLE" : "FETCH_NOT_ATTEMPTED";
  }
  return "INSUFFICIENT_DATA";
}

export function countHi55EventStates(
  events: Hi50EventRow[],
): Record<Hi55EventState, number> {
  const empty: Record<Hi55EventState, number> = {
    FETCH_NOT_ATTEMPTED: 0,
    FETCH_ELIGIBLE: 0,
    FETCH_IN_PROGRESS: 0,
    FETCH_SUCCESS: 0,
    FETCH_FAILED: 0,
    SNAPSHOT_AVAILABLE: 0,
    EXTRACTION_REQUIRED: 0,
    EXTRACTED: 0,
    OUTCOME_OBSERVED: 0,
    VERIFIED_SOLD: 0,
    SOLD_WITHOUT_PRICE: 0,
    PRICE_VERIFIED: 0,
    CONFLICT: 0,
    REVIEW_REQUIRED: 0,
    INSUFFICIENT_DATA: 0,
    LEGACY_UNKNOWN_FAILURE: 0,
  };
  for (const e of events) {
    empty[deriveHi55EventState(e)] += 1;
  }
  return empty;
}
