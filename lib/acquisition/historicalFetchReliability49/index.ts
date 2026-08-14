export type { FetchReliabilityState, FetchFailureCode } from "./fetchFailureCodes";
export type { NormalizedFetchAudit } from "./fetchResultNormalizer";
export type { FetchReliabilityMetrics } from "./fetchReliability";
export type { FetchRetryRecommendation } from "./fetchRetryRecommendations";

export { HISTORICAL_FETCH_RELIABILITY49_VERSION } from "./config";
export {
  classifyFetchAttempt,
  classifyFetchFailure,
  mapErrorCodeToFetchState,
  isNetworkFailureCode,
} from "./fetchClassifier";
export {
  evaluateRetry,
  countAttemptsForProperty,
  computeRetryDelay,
  isRetryableErrorCode,
} from "./fetchRetryPolicy";
export { deriveRetryRecommendation } from "@/lib/intelligence/historicalSourceCoverage48/diagnosticStates";
export { recommendRetryAction } from "./fetchRetryRecommendations";
export { normalizeFetchAudit } from "./fetchResultNormalizer";
export {
  isEligibleForP1Fetch,
  isEligibleForRetry,
  isEligibleForNetworkRetry,
  filterRetryableEvents,
  filterNetworkRetryEvents,
  filterP1Events,
} from "./fetchEligibility";
export {
  aggregateFetchReliability,
  buildFetchDiagnostic,
  latestRefetchRunForProperty,
} from "./fetchReliability";
export { validateSnapshotContent } from "@/lib/intelligence/historicalSourceCoverage48/snapshotValidation";
