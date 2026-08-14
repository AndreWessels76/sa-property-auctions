/**
 * Aggregate HSC 4.8 metrics from per-event diagnostics.
 */

import type {
  Hsc48CoverageFractions,
  Hsc48EventDiagnostic,
  Hsc48Metrics,
} from "./types";

export function aggregateEventMetrics(
  events: Hsc48EventDiagnostic[],
  base: Partial<Hsc48Metrics> = {},
): Hsc48Metrics {
  const m: Hsc48Metrics = {
    propertyMasters: base.propertyMasters ?? 0,
    auctionEvents: base.auctionEvents ?? 0,
    historicalEvents: events.length,
    p1: base.p1 ?? events.filter((e) => e.queuePriority === 1).length,
    p2: base.p2 ?? events.filter((e) => e.queuePriority === 2).length,
    p3: base.p3 ?? events.filter((e) => e.queuePriority === 3).length,
    p4: base.p4 ?? events.filter((e) => e.queuePriority === 4).length,
    queueBlocked: base.queueBlocked ?? 0,
    queueUnavailable: base.queueUnavailable ?? 0,
    queueCompleted: base.queueCompleted ?? 0,
    enrichmentAttempts: base.enrichmentAttempts ?? 0,
    successfulFetches: events.filter((e) => e.fetchSuccessful).length,
    failedFetches: events.filter(
      (e) => e.fetchAttempted && !e.fetchSuccessful,
    ).length,
    sourceFound: events.filter(
      (e) =>
        e.source.sourceStatus === "FOUND" ||
        e.source.sourceStatus === "LICENSED",
    ).length,
    sourceLicensed: events.filter((e) => e.source.sourceStatus === "LICENSED").length,
    sourceBlocked: events.filter((e) => e.source.sourceStatus === "LICENSE_BLOCKED").length,
    sourceUnavailable: events.filter((e) => e.source.sourceStatus === "UNAVAILABLE").length,
    fetchAttempted: events.filter((e) => e.fetchAttempted).length,
    tlsErrors: events.filter((e) => e.primaryState === "FETCH_TLS_ERROR").length,
    networkErrors: events.filter((e) => e.primaryState === "FETCH_NETWORK_ERROR").length,
    dnsErrors: events.filter((e) => e.primaryState === "FETCH_DNS_ERROR").length,
    timeouts: events.filter((e) => e.primaryState === "FETCH_TIMEOUT").length,
    http403: events.filter((e) => e.primaryState === "FETCH_HTTP_403").length,
    http404: events.filter((e) => e.primaryState === "FETCH_HTTP_404").length,
    http429: events.filter((e) => e.primaryState === "FETCH_HTTP_429").length,
    http5xx: events.filter((e) => e.primaryState === "FETCH_HTTP_5XX").length,
    snapshots: events.filter((e) => e.snapshot.exists && !e.snapshot.noChange).length,
    noChange: events.filter((e) => e.snapshot.noChange).length,
    extractionAttempted: events.filter((e) => e.extraction.state !== "NOT_RUN").length,
    extractionSuccessful: events.filter((e) => e.extraction.state === "SUCCESS").length,
    extractionFailed: events.filter((e) => e.extraction.state === "FAILED").length,
    extractionNoEvidence: events.filter((e) => e.extraction.state === "NO_EVIDENCE").length,
    outcomeObservations: events.filter(
      (e) => e.outcomeState !== "UNKNOWN",
    ).length,
    verifiedSold: events.filter((e) => e.outcomeState === "SOLD" && e.resolutionState === "VERIFIED").length,
    soldWithoutPrice: events.filter((e) => e.salePriceState === "SOLD_WITHOUT_PRICE").length,
    unknownOutcomes: events.filter((e) => e.outcomeState === "UNKNOWN").length,
    verifiedSalePrices: events.filter((e) => e.salePriceState === "VERIFIED").length,
    conflicts: events.filter((e) => e.outcomeState === "CONFLICT").length,
    reviewRequired: events.filter(
      (e) =>
        e.primaryState === "IDENTITY_REVIEW_REQUIRED" ||
        e.primaryState === "CONFLICT_REVIEW_REQUIRED",
    ).length,
    comparableReady: base.comparableReady ?? 0,
    marketReadyTowns: base.marketReadyTowns ?? 0,
    acquisitionGaps: base.acquisitionGaps ?? 0,
    catalogueLeaks: base.catalogueLeaks ?? 0,
  };

  if (base.enrichmentAttempts != null && base.enrichmentAttempts > 0) {
    m.enrichmentAttempts = base.enrichmentAttempts;
  } else {
    m.enrichmentAttempts = events.filter((e) => e.fetchAttempted).length;
  }

  return m;
}

export function buildCoverageFractions(events: Hsc48EventDiagnostic[]): Hsc48CoverageFractions {
  const total = events.length;
  return {
    total,
    sourceFound: events.filter(
      (e) => e.source.sourceUrl || e.source.sourceStatus === "LICENSED",
    ).length,
    sourceLicensed: events.filter((e) => e.source.sourceStatus === "LICENSED").length,
    fetchAttempted: events.filter((e) => e.fetchAttempted).length,
    fetchSuccessful: events.filter((e) => e.fetchSuccessful).length,
    snapshots: events.filter((e) => e.snapshot.exists).length,
    extractions: events.filter((e) => e.extraction.state !== "NOT_RUN").length,
    outcomeEvidence: events.filter((e) => e.outcomeState !== "UNKNOWN").length,
    salePriceEvidence: events.filter((e) => e.salePriceState === "VERIFIED").length,
  };
}

export function stateBreakdown(events: Hsc48EventDiagnostic[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.primaryState] = (counts[e.primaryState] ?? 0) + 1;
  }
  return counts;
}

export function computeBeforeAfterDelta(
  before: Hsc48Metrics,
  after: Hsc48Metrics,
): Partial<Hsc48Metrics> {
  const delta: Partial<Hsc48Metrics> = {};
  const keys = Object.keys(before) as (keyof Hsc48Metrics)[];
  for (const k of keys) {
    if (after[k] !== before[k]) {
      delta[k] = after[k];
    }
  }
  return delta;
}
