import type { Hsc48EventDiagnostic } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { FetchReliabilityState } from "./fetchFailureCodes";

export type FetchReliabilityMetrics = {
  fetchAttempts: number;
  fetchSuccesses: number;
  fetchFailures: number;
  retryableFailures: number;
  retryExhausted: number;
  permanentFailures: number;
  timeouts: number;
  tlsFailures: number;
  dnsFailures: number;
  rateLimited: number;
  contentUnusable: number;
  authRequired: number;
  sourceBlocked: number;
  noChange: number;
};

export function aggregateFetchReliability(
  events: Hsc48EventDiagnostic[],
): FetchReliabilityMetrics {
  return {
    fetchAttempts: events.filter((e) => e.fetchAttempted).length,
    fetchSuccesses: events.filter((e) => e.fetchSuccessful).length,
    fetchFailures: events.filter((e) => e.fetchAttempted && !e.fetchSuccessful).length,
    retryableFailures: events.filter((e) => e.fetchError?.retryable).length,
    retryExhausted: events.filter(
      (e) => e.acquisitionPriority && !e.acquisitionPriority.retryable && e.fetchAttempted && !e.fetchSuccessful,
    ).length,
    permanentFailures: events.filter((e) => e.acquisitionPriority?.priority === 4).length,
    timeouts: events.filter((e) => e.fetchError?.errorCode === "TIMEOUT").length,
    tlsFailures: events.filter((e) => e.fetchError?.errorCode === "TLS_ERROR").length,
    dnsFailures: events.filter((e) => e.fetchError?.errorCode === "DNS_ERROR").length,
    rateLimited: events.filter((e) => e.fetchError?.errorCode === "HTTP_429").length,
    contentUnusable: events.filter(
      (e) => e.snapshot.valid === false || e.fetchError?.errorCode === "CONTENT_UNAVAILABLE",
    ).length,
    authRequired: events.filter(
      (e) =>
        e.fetchError?.errorCode === "AUTH_REQUIRED" ||
        e.fetchError?.errorCode === "HTTP_401",
    ).length,
    sourceBlocked: events.filter((e) => e.fetchError?.errorCode === "HTTP_403").length,
    noChange: events.filter((e) => e.snapshot.noChange).length,
  };
}

export { buildFetchDiagnostic, latestRefetchRunForProperty } from "@/lib/intelligence/historicalSourceCoverage48/fetchDiagnostics";
