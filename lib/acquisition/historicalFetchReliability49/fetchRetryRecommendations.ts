import type { FetchErrorCode } from "@/lib/intelligence/historicalSourceCoverage48/fetchErrorClassification";
import { isRetryableErrorCode } from "@/lib/intelligence/historicalSourceCoverage48/fetchErrorClassification";
import type { FetchReliabilityState } from "./fetchFailureCodes";
import { isNetworkFailureCode } from "./fetchClassifier";

export type FetchRetryRecommendation =
  | "RETRY_NOW"
  | "RETRY_LATER"
  | "DO_NOT_RETRY"
  | "REQUIRES_ADMIN_REVIEW";

export function recommendRetryAction(input: {
  fetchState: FetchReliabilityState;
  errorCode: FetchErrorCode;
  retryable: boolean;
  attempts: number;
  maxAttempts: number;
}): { recommendation: FetchRetryRecommendation; reason: string } {
  if (input.fetchState === "FETCH_NOT_ATTEMPTED") {
    return { recommendation: "RETRY_NOW", reason: "Licensed source — first fetch not attempted" };
  }
  if (input.fetchState === "FETCH_RETRY_EXHAUSTED") {
    return { recommendation: "DO_NOT_RETRY", reason: `Retry limit reached (${input.maxAttempts})` };
  }
  if (input.fetchState === "FETCH_PERMANENT_FAILURE") {
    return { recommendation: "DO_NOT_RETRY", reason: "Permanent source failure" };
  }
  if (input.fetchState === "FETCH_AUTH_REQUIRED") {
    return { recommendation: "REQUIRES_ADMIN_REVIEW", reason: "Authentication required" };
  }
  if (input.retryable && isRetryableErrorCode(input.errorCode)) {
    if (isNetworkFailureCode(input.errorCode)) {
      return { recommendation: "RETRY_LATER", reason: `Network failure ${input.errorCode} — retryable` };
    }
    return { recommendation: "RETRY_LATER", reason: `Transient failure ${input.errorCode}` };
  }
  return { recommendation: "DO_NOT_RETRY", reason: `Non-retryable: ${input.errorCode}` };
}
