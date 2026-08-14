/**
 * Deterministic diagnostic states for HSC 4.8.
 * Do not collapse distinct technical failures into generic FAILED.
 */

export type Hsc48DiagnosticState =
  | "SOURCE_NOT_FOUND"
  | "SOURCE_NOT_LICENSED"
  | "SOURCE_LICENSE_BLOCKED"
  | "SOURCE_INELIGIBLE"
  | "FETCH_NOT_ATTEMPTED"
  | "FETCH_NETWORK_ERROR"
  | "FETCH_TLS_ERROR"
  | "FETCH_DNS_ERROR"
  | "FETCH_TIMEOUT"
  | "FETCH_HTTP_ERROR"
  | "FETCH_HTTP_403"
  | "FETCH_HTTP_404"
  | "FETCH_HTTP_429"
  | "FETCH_HTTP_5XX"
  | "FETCH_REDIRECT_ERROR"
  | "FETCH_SUCCESS_NO_CONTENT"
  | "FETCH_SUCCESS"
  | "SNAPSHOT_NOT_CREATED"
  | "SNAPSHOT_CREATED"
  | "NO_CHANGE"
  | "EXTRACTION_NOT_RUN"
  | "EXTRACTION_COMPLETED"
  | "EXTRACTION_FAILED"
  | "EXTRACTION_SUCCESS_NO_EVIDENCE"
  | "OUTCOME_NOT_FOUND"
  | "SALE_PRICE_NOT_FOUND"
  | "IDENTITY_REVIEW_REQUIRED"
  | "CONFLICT_REVIEW_REQUIRED"
  | "INSUFFICIENT_DATA"
  | "READY_FOR_INTELLIGENCE";

export type Hsc48RetryRecommendation =
  | "RETRY_NOW"
  | "RETRY_LATER"
  | "DO_NOT_RETRY"
  | "REQUIRES_SOURCE_FIX"
  | "REQUIRES_ADMIN_REVIEW";

export type Hsc48SourceStatus =
  | "FOUND"
  | "MISSING"
  | "LICENSED"
  | "LICENSE_BLOCKED"
  | "INELIGIBLE"
  | "UNAVAILABLE";

export function classifyFetchError(input: {
  enrichmentStatus?: string | null;
  refetchStatus?: string | null;
  httpStatus?: number | null;
  error?: string | null;
}): Hsc48DiagnosticState | null {
  const err = (input.error ?? "").toLowerCase();
  const status = input.enrichmentStatus ?? "";
  const refetch = input.refetchStatus ?? "";

  if (err.includes("tls") || err.includes("certificate") || err.includes("unable to verify")) {
    return "FETCH_TLS_ERROR";
  }
  if (err.includes("enotfound") || err.includes("dns") || err.includes("getaddrinfo")) {
    return "FETCH_DNS_ERROR";
  }
  if (err.includes("timeout") || err.includes("etimedout") || err.includes("aborted")) {
    return "FETCH_TIMEOUT";
  }
  if (err.includes("network") || err.includes("econnrefused") || err.includes("fetch failed")) {
    return "FETCH_NETWORK_ERROR";
  }
  if (err.includes("redirect")) {
    return "FETCH_REDIRECT_ERROR";
  }

  const http = input.httpStatus;
  if (http === 403) return "FETCH_HTTP_403";
  if (http === 404) return "FETCH_HTTP_404";
  if (http === 429) return "FETCH_HTTP_429";
  if (http != null && http >= 500) return "FETCH_HTTP_5XX";
  if (http != null && http >= 400) return "FETCH_HTTP_ERROR";

  if (status === "FETCH_FAILED" || refetch === "failed") return "FETCH_HTTP_ERROR";
  if (status === "SOURCE_UNAVAILABLE" || refetch === "source_unavailable") {
    if (http === 404) return "FETCH_HTTP_404";
    if (http === 403) return "FETCH_HTTP_403";
    return "FETCH_HTTP_ERROR";
  }
  if (status === "SKIPPED_LICENSE" || refetch === "SKIPPED_LICENSE") return "SOURCE_LICENSE_BLOCKED";
  if (refetch === "SKIPPED_ROBOTS") return "SOURCE_LICENSE_BLOCKED";

  return null;
}

export function deriveRetryRecommendation(
  state: Hsc48DiagnosticState,
): Hsc48RetryRecommendation {
  switch (state) {
    case "FETCH_TLS_ERROR":
    case "FETCH_NETWORK_ERROR":
    case "FETCH_DNS_ERROR":
      return "REQUIRES_SOURCE_FIX";
    case "FETCH_HTTP_404":
    case "SOURCE_NOT_FOUND":
    case "SOURCE_INELIGIBLE":
      return "DO_NOT_RETRY";
    case "FETCH_HTTP_403":
    case "SOURCE_LICENSE_BLOCKED":
    case "SOURCE_NOT_LICENSED":
      return "DO_NOT_RETRY";
    case "FETCH_HTTP_429":
    case "FETCH_HTTP_5XX":
    case "FETCH_TIMEOUT":
      return "RETRY_LATER";
    case "IDENTITY_REVIEW_REQUIRED":
    case "CONFLICT_REVIEW_REQUIRED":
      return "REQUIRES_ADMIN_REVIEW";
    case "EXTRACTION_SUCCESS_NO_EVIDENCE":
    case "OUTCOME_NOT_FOUND":
    case "SALE_PRICE_NOT_FOUND":
    case "NO_CHANGE":
      return "DO_NOT_RETRY";
    case "FETCH_NOT_ATTEMPTED":
    case "SNAPSHOT_NOT_CREATED":
      return "RETRY_NOW";
    case "READY_FOR_INTELLIGENCE":
      return "DO_NOT_RETRY";
    default:
      return "RETRY_LATER";
  }
}
