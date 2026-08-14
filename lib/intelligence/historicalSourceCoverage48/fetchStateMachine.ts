/**
 * HSA 4.9 — deterministic fetch acquisition state machine.
 */

import type { FetchErrorCode } from "./fetchErrorClassification";
import { errorCodeToFetchState } from "./retryPolicy";
import type { Hsc48EventDiagnostic } from "./types";

export type Hsa49FetchState =
  | "SOURCE_CONFIRMED"
  | "FETCH_NOT_ATTEMPTED"
  | "FETCH_QUEUED"
  | "FETCH_ATTEMPTED"
  | "FETCH_SUCCESS"
  | "FETCH_HTTP_ERROR"
  | "FETCH_TIMEOUT"
  | "FETCH_DNS_ERROR"
  | "FETCH_TLS_ERROR"
  | "FETCH_BLOCKED"
  | "FETCH_RATE_LIMITED"
  | "FETCH_AUTH_REQUIRED"
  | "FETCH_NOT_FOUND"
  | "FETCH_REDIRECT_ERROR"
  | "FETCH_SOURCE_CHANGED"
  | "SNAPSHOT_AVAILABLE"
  | "SNAPSHOT_VALID"
  | "SNAPSHOT_INVALID"
  | "EXTRACTION_AVAILABLE"
  | "OUTCOME_AVAILABLE"
  | "SALE_PRICE_AVAILABLE";

export type AcquisitionTimelineStep = {
  stage: string;
  status: "COMPLETE" | "FAILED" | "PENDING" | "SKIPPED" | "UNKNOWN";
  detail: string | null;
};

export function deriveFetchState(input: {
  event: Hsc48EventDiagnostic;
  errorCode?: FetchErrorCode;
}): Hsa49FetchState {
  const { event, errorCode } = input;

  if (event.source.sourceStatus === "MISSING") {
    return "SOURCE_CONFIRMED";
  }

  if (!event.fetchAttempted) {
    return event.queuePriority != null ? "FETCH_QUEUED" : "FETCH_NOT_ATTEMPTED";
  }

  if (event.fetchSuccessful) {
    if (event.snapshot.valid === false) return "SNAPSHOT_INVALID";
    if (event.extraction.state !== "NOT_RUN") return "EXTRACTION_AVAILABLE";
    if (event.snapshot.exists) return "SNAPSHOT_VALID";
    return "FETCH_SUCCESS";
  }

  if (errorCode && errorCode !== "NONE") {
    return errorCodeToFetchState(errorCode) as Hsa49FetchState;
  }

  return "FETCH_HTTP_ERROR";
}

export function buildAcquisitionTimeline(
  event: Hsc48EventDiagnostic,
  errorCode?: FetchErrorCode,
): AcquisitionTimelineStep[] {
  const fetchState = deriveFetchState({ event, errorCode });

  const step = (
    stage: string,
    complete: boolean,
    failed: boolean,
    detail: string | null,
  ): AcquisitionTimelineStep => ({
    stage,
    status: failed ? "FAILED" : complete ? "COMPLETE" : "PENDING",
    detail,
  });

  const sourceOk =
    event.source.sourceStatus === "LICENSED" ||
    event.source.sourceStatus === "FOUND";

  return [
    step("SOURCE_CONFIRMED", sourceOk, false, event.source.sourceUrl),
    step(
      "FETCH",
      event.fetchSuccessful,
      event.fetchAttempted && !event.fetchSuccessful,
      fetchState,
    ),
    step(
      "SNAPSHOT",
      event.snapshot.exists && event.snapshot.valid !== false,
      event.snapshot.valid === false,
      event.snapshot.valid === false ? "SNAPSHOT_INVALID" : event.snapshot.snapshotId,
    ),
    step(
      "EXTRACTION",
      event.extraction.state === "SUCCESS" || event.extraction.state === "NO_EVIDENCE",
      event.extraction.state === "FAILED",
      event.extraction.state,
    ),
    step(
      "OUTCOME",
      event.outcomeState !== "UNKNOWN",
      false,
      event.outcomeState,
    ),
    step(
      "SALE_PRICE",
      event.salePriceState === "VERIFIED",
      false,
      event.salePriceState,
    ),
    step("RESOLUTION", event.resolutionState === "VERIFIED", false, event.resolutionState),
    step("QUALITY", Boolean(event.evidenceQuality), false, event.evidenceQuality),
  ];
}
