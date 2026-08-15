import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi51DryRunCandidate, Hi51FetchResultsSummary } from "./types";

export function filterLegacyFailureCandidates(events: Hi50EventRow[]): Hi50EventRow[] {
  return events.filter((e) => e.failureClassification === "LEGACY_UNKNOWN_FAILURE");
}

export function filterP1NeverAttempted(events: Hi50EventRow[]): Hi50EventRow[] {
  return events.filter(
    (e) =>
      e.recoveryPriority === 1 &&
      (e.evidenceState === "FETCH_ELIGIBLE" ||
        e.evidenceState === "FETCH_NOT_ATTEMPTED"),
  );
}

export function countNeverAttempted(events: Hi50EventRow[]): number {
  return events.filter(
    (e) =>
      e.evidenceState === "FETCH_ELIGIBLE" ||
      e.evidenceState === "FETCH_NOT_ATTEMPTED",
  ).length;
}

export function buildFetchResultsSummary(events: Hi50EventRow[]): Hi51FetchResultsSummary {
  const attempted = events.filter((e) => e.attemptNumber > 0 || e.lastAttempt).length;
  const successful = events.filter(
    (e) =>
      e.evidenceState === "FETCH_SUCCESS" ||
      e.evidenceState === "SNAPSHOT_AVAILABLE" ||
      e.evidenceState === "VERIFIED" ||
      e.snapshot,
  ).length;
  const failed = events.filter(
    (e) =>
      e.evidenceState === "FETCH_HTTP_ERROR" ||
      e.evidenceState === "FETCH_NETWORK_ERROR" ||
      e.evidenceState === "FETCH_BLOCKED",
  ).length;

  return {
    attempted,
    successful,
    failed,
    retryable: events.filter((e) => e.retryable).length,
    permanent: events.filter((e) => e.recoveryPriority === 4 && e.attemptNumber > 0).length,
    legacy: events.filter((e) => e.failureClassification === "LEGACY_UNKNOWN_FAILURE").length,
  };
}

/**
 * Deterministic P1 acquire targets — same ordering as Dry Run P1.
 * Dedupes by listingPropertyId when provided; skips rows without a property id.
 * Does NOT use the HEA exact-URL priority queue (which may already be fetched).
 */
export function selectP1AcquireTargets(input: {
  events: Hi50EventRow[];
  limit: number;
  listingPropertyIdByObservation?: Map<string, string | null>;
}): {
  selected: Hi50EventRow[];
  skipped: Array<{ observationId: string; reason: string }>;
} {
  const eligible = filterP1NeverAttempted(input.events);
  const selected: Hi50EventRow[] = [];
  const skipped: Array<{ observationId: string; reason: string }> = [];
  const seenPropertyIds = new Set<string>();
  const idMap = input.listingPropertyIdByObservation;

  for (const row of eligible) {
    if (selected.length >= input.limit) break;

    if (idMap) {
      const propertyId = idMap.get(row.observationId) ?? null;
      if (!propertyId) {
        skipped.push({
          observationId: row.observationId,
          reason: "MISSING_LISTING_PROPERTY_ID",
        });
        continue;
      }
      if (seenPropertyIds.has(propertyId)) {
        skipped.push({
          observationId: row.observationId,
          reason: "DUPLICATE_LISTING_PROPERTY_ID",
        });
        continue;
      }
      seenPropertyIds.add(propertyId);
    }

    selected.push(row);
  }

  return { selected, skipped };
}

export function buildEnhancedDryRunCandidates(
  events: Hi50EventRow[],
  limit: number,
): Hi51DryRunCandidate[] {
  return filterP1NeverAttempted(events).slice(0, limit).map((e) => ({
    eventId: e.auctionEventId,
    observationId: e.observationId,
    propertyMasterId: null,
    listingPropertyId: null,
    propertyLabel: e.propertyLabel,
    town: e.town,
    agency: e.agency,
    source: e.sourceStatus,
    sourceUrl: e.sourceUrl,
    priority: e.recoveryPriority,
    currentState: e.evidenceState,
    lastAttempt: e.lastAttempt,
    whyEligible: "Licensed source — fetch not attempted (P1 eligible)",
    expectedAction: "Acquire — first licensed source fetch",
  }));
}

export function buildLegacyDryRunCandidates(
  events: Hi50EventRow[],
  limit: number,
): Hi51DryRunCandidate[] {
  return filterLegacyFailureCandidates(events).slice(0, limit).map((e) => ({
    eventId: e.auctionEventId,
    observationId: e.observationId,
    propertyMasterId: null,
    propertyLabel: e.propertyLabel,
    town: e.town,
    agency: e.agency,
    source: e.sourceStatus,
    sourceUrl: e.sourceUrl,
    priority: e.recoveryPriority,
    currentState: e.evidenceState,
    lastAttempt: e.lastAttempt,
    expectedAction: "Retry legacy failure — controlled re-fetch with explicit metadata",
  }));
}
