/**
 * Map HSC 4.8 event diagnostics to HI 5.0 evidence states.
 */

import type { Hsc48EventDiagnostic } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { Hi50EvidenceState } from "./types";

export function deriveHi50EvidenceState(event: Hsc48EventDiagnostic): Hi50EvidenceState {
  if (event.resolutionState === "VERIFIED") return "VERIFIED";
  if (event.outcomeState === "CONFLICT" || event.primaryState === "CONFLICT_REVIEW_REQUIRED") {
    return "CONFLICT";
  }
  if (
    event.primaryState === "IDENTITY_REVIEW_REQUIRED" ||
    event.resolutionState === "REVIEW_REQUIRED"
  ) {
    return "REVIEW_REQUIRED";
  }

  if (event.salePriceState === "VERIFIED") return "SALE_PRICE_FOUND";
  if (event.outcomeState !== "UNKNOWN") return "OUTCOME_FOUND";

  if (event.extraction.state === "SUCCESS" || event.extraction.state === "NO_EVIDENCE") {
    return "EXTRACTION_AVAILABLE";
  }
  if (event.snapshot.exists && event.extraction.state === "NOT_RUN") {
    return "SNAPSHOT_AVAILABLE";
  }

  if (event.fetchSuccessful) return "FETCH_SUCCESS";

  if (!event.fetchAttempted) {
    return event.source.sourceStatus === "LICENSED" ? "FETCH_ELIGIBLE" : "FETCH_NOT_ATTEMPTED";
  }

  if (event.primaryState === "SOURCE_LICENSE_BLOCKED" || event.fetchError?.errorCode === "HTTP_403") {
    return "FETCH_BLOCKED";
  }
  if (
    event.source.sourceStatus === "UNAVAILABLE" ||
    event.primaryState === "SOURCE_NOT_FOUND"
  ) {
    return "SOURCE_UNAVAILABLE";
  }

  const networkCodes = ["DNS_ERROR", "TLS_ERROR", "TIMEOUT", "CONNECTION_ERROR"];
  if (event.fetchError && networkCodes.includes(event.fetchError.errorCode)) {
    return "FETCH_NETWORK_ERROR";
  }

  if (event.fetchAttempted && !event.fetchSuccessful) {
    return "FETCH_HTTP_ERROR";
  }

  if (event.primaryState === "INSUFFICIENT_DATA") return "INSUFFICIENT_DATA";

  return "INSUFFICIENT_DATA";
}

export function stateBreakdownHi50(
  events: Hsc48EventDiagnostic[],
): Record<Hi50EvidenceState, number> {
  const counts = {} as Record<Hi50EvidenceState, number>;
  for (const event of events) {
    const state = deriveHi50EvidenceState(event);
    counts[state] = (counts[state] ?? 0) + 1;
  }
  return counts;
}
