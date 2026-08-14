import type { Hsc48EventDiagnostic } from "@/lib/intelligence/historicalSourceCoverage48/types";
import { isNetworkFailureCode } from "./fetchClassifier";
import type { FetchErrorCode } from "@/lib/intelligence/historicalSourceCoverage48/fetchErrorClassification";

export function isEligibleForP1Fetch(event: Hsc48EventDiagnostic): boolean {
  return (
    event.acquisitionPriority?.priority === 1 ||
    event.primaryState === "FETCH_NOT_ATTEMPTED"
  );
}

export function isEligibleForRetry(event: Hsc48EventDiagnostic): boolean {
  return Boolean(event.fetchError?.retryable && event.acquisitionPriority?.priority === 2);
}

export function isEligibleForNetworkRetry(event: Hsc48EventDiagnostic): boolean {
  const code = event.fetchError?.errorCode as FetchErrorCode | undefined;
  return Boolean(code && isNetworkFailureCode(code) && event.fetchError?.retryable);
}

export function isPermanentFailure(event: Hsc48EventDiagnostic): boolean {
  return event.acquisitionPriority?.priority === 4;
}

export function filterRetryableEvents(events: Hsc48EventDiagnostic[]): Hsc48EventDiagnostic[] {
  return events.filter(isEligibleForRetry);
}

export function filterNetworkRetryEvents(events: Hsc48EventDiagnostic[]): Hsc48EventDiagnostic[] {
  return events.filter(isEligibleForNetworkRetry);
}

export function filterP1Events(events: Hsc48EventDiagnostic[]): Hsc48EventDiagnostic[] {
  return events.filter(isEligibleForP1Fetch);
}
