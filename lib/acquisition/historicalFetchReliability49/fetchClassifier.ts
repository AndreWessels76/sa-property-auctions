/**
 * Classify fetch outcomes into HSA 4.9 reliability states.
 */

import {
  classifyFetchFailure,
  type FetchErrorCode,
} from "@/lib/intelligence/historicalSourceCoverage48/fetchErrorClassification";
import {
  evaluateRetry,
  countAttemptsForProperty,
} from "@/lib/intelligence/historicalSourceCoverage48/retryPolicy";
import type { FetchReliabilityState } from "./fetchFailureCodes";

const NETWORK_CODES: FetchErrorCode[] = [
  "DNS_ERROR",
  "TLS_ERROR",
  "CONNECTION_ERROR",
  "TIMEOUT",
];

export function isNetworkFailureCode(code: FetchErrorCode): boolean {
  return NETWORK_CODES.includes(code);
}

export function mapErrorCodeToFetchState(input: {
  errorCode: FetchErrorCode;
  fetchAttempted: boolean;
  fetchSuccessful: boolean;
  noChange: boolean;
  enrichmentStatus?: string | null;
  refetchStatus?: string | null;
  attemptNumber: number;
  maxAttempts: number;
}): FetchReliabilityState {
  if (!input.fetchAttempted) return "FETCH_NOT_ATTEMPTED";
  if (input.noChange || input.enrichmentStatus === "NO_CHANGE" || input.refetchStatus === "no_change") {
    return "FETCH_NO_CHANGE";
  }
  if (input.fetchSuccessful) return "FETCH_SUCCESS";

  if (input.attemptNumber >= input.maxAttempts) {
    return "FETCH_RETRY_EXHAUSTED";
  }

  switch (input.errorCode) {
    case "DNS_ERROR":
      return "FETCH_DNS_ERROR";
    case "TLS_ERROR":
      return "FETCH_TLS_ERROR";
    case "TIMEOUT":
      return "FETCH_TIMEOUT";
    case "HTTP_429":
      return "FETCH_RATE_LIMITED";
    case "HTTP_403":
      return "FETCH_SOURCE_BLOCKED";
    case "AUTH_REQUIRED":
    case "HTTP_401":
      return "FETCH_AUTH_REQUIRED";
    case "REDIRECT_LOOP":
      return "FETCH_ROBOTS_BLOCKED";
    case "EMPTY_RESPONSE":
      return "FETCH_EMPTY_RESPONSE";
    case "CONTENT_UNAVAILABLE":
      return "FETCH_CONTENT_UNUSABLE";
    case "HTTP_404":
    case "HTTP_400":
    case "INVALID_SOURCE_URL":
      return "FETCH_PERMANENT_FAILURE";
    case "HTTP_500":
    case "HTTP_502":
    case "HTTP_503":
    case "HTTP_504":
    case "HTTP_408":
    case "HTTP_OTHER":
    case "CONNECTION_ERROR":
      return "FETCH_RETRYABLE_FAILURE";
    case "NONE":
      return "FETCH_HTTP_ERROR";
    default:
      return "FETCH_HTTP_ERROR";
  }
}

export function classifyFetchAttempt(input: {
  propertyId: string;
  enrichmentRuns: Array<{ property_id: string | null; status: string }>;
  error?: string | null;
  httpStatus?: number | null;
  enrichmentStatus?: string | null;
  refetchStatus?: string | null;
  contentLength?: number | null;
  sourceUrl?: string | null;
  fetchSuccessful?: boolean;
  noChange?: boolean;
}): {
  errorCode: FetchErrorCode;
  fetchState: FetchReliabilityState;
  retryable: boolean;
  retryDecision: ReturnType<typeof evaluateRetry>;
} {
  const failure = classifyFetchFailure({
    error: input.error,
    httpStatus: input.httpStatus,
    enrichmentStatus: input.enrichmentStatus,
    refetchStatus: input.refetchStatus,
    contentLength: input.contentLength,
    sourceUrl: input.sourceUrl,
  });

  const attemptNumber = countAttemptsForProperty(input.propertyId, input.enrichmentRuns);
  const retryDecision = evaluateRetry({
    propertyId: input.propertyId,
    enrichmentRuns: input.enrichmentRuns,
    error: input.error,
    httpStatus: input.httpStatus,
    enrichmentStatus: input.enrichmentStatus,
    refetchStatus: input.refetchStatus,
  });

  const fetchAttempted = attemptNumber > 0 || Boolean(input.enrichmentStatus);
  const fetchState = mapErrorCodeToFetchState({
    errorCode: failure.errorCode,
    fetchAttempted,
    fetchSuccessful: input.fetchSuccessful === true,
    noChange: input.noChange === true,
    enrichmentStatus: input.enrichmentStatus,
    refetchStatus: input.refetchStatus,
    attemptNumber,
    maxAttempts: retryDecision.maxAttempts,
  });

  return {
    errorCode: failure.errorCode,
    fetchState,
    retryable: retryDecision.retryable && retryDecision.shouldRetry,
    retryDecision,
  };
}

export { classifyFetchFailure };
