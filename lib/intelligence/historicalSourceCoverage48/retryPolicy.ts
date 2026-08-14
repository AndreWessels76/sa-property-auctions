/**
 * HSA 4.9 — bounded retry policy with exponential backoff.
 */

import {
  HSA49_MAX_RETRY_ATTEMPTS,
  HSA49_RETRY_BASE_DELAY_MS,
  HSA49_RETRY_MAX_DELAY_MS,
} from "./config";
import {
  classifyFetchFailure,
  isRetryableErrorCode,
  type FetchErrorCode,
} from "./fetchErrorClassification";

export type RetryDecision = {
  shouldRetry: boolean;
  attemptNumber: number;
  maxAttempts: number;
  retryable: boolean;
  delayMs: number;
  retryAfterMs: number | null;
  reason: string;
};

export function countAttemptsForProperty(
  propertyId: string,
  enrichmentRuns: Array<{ property_id: string | null; status: string }>,
): number {
  return enrichmentRuns.filter(
    (r) =>
      r.property_id === propertyId &&
      !["SKIPPED_NOT_HISTORICAL", "NO_CHANGE"].includes(r.status),
  ).length;
}

export function computeRetryDelay(input: {
  attemptNumber: number;
  retryAfterHeaderSeconds?: number | null;
}): number {
  if (input.retryAfterHeaderSeconds != null && input.retryAfterHeaderSeconds > 0) {
    return Math.min(
      input.retryAfterHeaderSeconds * 1000,
      HSA49_RETRY_MAX_DELAY_MS,
    );
  }
  const exp = HSA49_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, input.attemptNumber - 1);
  return Math.min(exp, HSA49_RETRY_MAX_DELAY_MS);
}

export function evaluateRetry(input: {
  propertyId: string;
  enrichmentRuns: Array<{ property_id: string | null; status: string }>;
  error?: string | null;
  httpStatus?: number | null;
  enrichmentStatus?: string | null;
  refetchStatus?: string | null;
  retryAfterSeconds?: number | null;
}): RetryDecision {
  const attemptNumber = countAttemptsForProperty(
    input.propertyId,
    input.enrichmentRuns,
  );
  const failure = classifyFetchFailure({
    error: input.error,
    httpStatus: input.httpStatus,
    enrichmentStatus: input.enrichmentStatus,
    refetchStatus: input.refetchStatus,
  });

  const retryable = isRetryableErrorCode(failure.errorCode);
  const underLimit = attemptNumber < HSA49_MAX_RETRY_ATTEMPTS;
  const shouldRetry = retryable && underLimit;

  const delayMs = shouldRetry
    ? computeRetryDelay({
        attemptNumber: attemptNumber + 1,
        retryAfterHeaderSeconds: input.retryAfterSeconds,
      })
    : 0;

  let reason: string;
  if (!retryable) {
    reason = `Non-retryable error: ${failure.errorCode}`;
  } else if (!underLimit) {
    reason = `Retry limit reached (${HSA49_MAX_RETRY_ATTEMPTS} attempts)`;
  } else {
    reason = `Retryable ${failure.errorCode} — attempt ${attemptNumber + 1}/${HSA49_MAX_RETRY_ATTEMPTS}`;
  }

  return {
    shouldRetry,
    attemptNumber,
    maxAttempts: HSA49_MAX_RETRY_ATTEMPTS,
    retryable,
    delayMs,
    retryAfterMs:
      input.retryAfterSeconds != null ? input.retryAfterSeconds * 1000 : null,
    reason,
  };
}

export function errorCodeToFetchState(code: FetchErrorCode): string {
  switch (code) {
    case "DNS_ERROR":
      return "FETCH_DNS_ERROR";
    case "TLS_ERROR":
      return "FETCH_TLS_ERROR";
    case "CONNECTION_ERROR":
      return "FETCH_NETWORK_ERROR";
    case "TIMEOUT":
      return "FETCH_TIMEOUT";
    case "HTTP_403":
      return "FETCH_BLOCKED";
    case "HTTP_404":
      return "FETCH_NOT_FOUND";
    case "HTTP_429":
      return "FETCH_RATE_LIMITED";
    case "HTTP_401":
    case "AUTH_REQUIRED":
      return "FETCH_AUTH_REQUIRED";
    case "REDIRECT_LOOP":
      return "FETCH_REDIRECT_ERROR";
    case "SOURCE_CHANGED":
      return "FETCH_SOURCE_CHANGED";
    case "HTTP_500":
    case "HTTP_502":
    case "HTTP_503":
    case "HTTP_504":
    case "HTTP_OTHER":
    case "HTTP_400":
    case "HTTP_408":
      return "FETCH_HTTP_ERROR";
    default:
      return "FETCH_HTTP_ERROR";
  }
}
