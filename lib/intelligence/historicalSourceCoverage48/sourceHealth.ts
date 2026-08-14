/**
 * HSA 4.9 — source/partner health metrics.
 */

import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import type { RefetchRunRow } from "@/lib/acquisition/refetch/refetchAudit";
import { classifyFetchFailure, failureBreakdown } from "./fetchErrorClassification";
import type { Hsc48EventDiagnostic } from "./types";

export type Hsa49SourceHealth = {
  partner: string;
  eligible: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  successRate: number | null;
  retryCount: number;
  averageFetchDurationMs: number | null;
  lastSuccessfulFetch: string | null;
  lastFailedFetch: string | null;
  httpErrorDistribution: Record<string, number>;
  timeoutCount: number;
  dnsTlsFailureCount: number;
  rateLimitCount: number;
  sourceChangedCount: number;
  snapshotCoverage: number;
  extractionCoverage: number;
  outcomeCoverage: number;
  salePriceCoverage: number;
};

function partnerKey(event: Hsc48EventDiagnostic): string {
  return event.agency ?? event.source.sourceName ?? "Unknown";
}

export function buildSourceHealthMetrics(input: {
  events: Hsc48EventDiagnostic[];
  enrichmentRuns: EnrichmentRunRow[];
  refetchRuns: RefetchRunRow[];
}): Hsa49SourceHealth[] {
  const byPartner = new Map<string, Hsc48EventDiagnostic[]>();
  for (const e of input.events) {
    const key = partnerKey(e);
    const list = byPartner.get(key) ?? [];
    list.push(e);
    byPartner.set(key, list);
  }

  const results: Hsa49SourceHealth[] = [];

  for (const [partner, events] of byPartner) {
    const propertyIds = new Set(
      events.map((e) => e.listingPropertyId).filter(Boolean) as string[],
    );
    const partnerRuns = input.enrichmentRuns.filter(
      (r) => r.property_id && propertyIds.has(r.property_id),
    );
    const partnerRefetch = input.refetchRuns.filter(
      (r) => r.property_id && propertyIds.has(r.property_id),
    );

    const failures = events
      .filter((e) => e.fetchAttempted && !e.fetchSuccessful)
      .map((e) =>
        classifyFetchFailure({
          error:
            e.fetch?.networkError ?? e.fetch?.tlsError ?? e.fetch?.dnsError ?? null,
          httpStatus: e.fetch?.httpStatus ?? null,
          enrichmentStatus: e.fetch?.enrichmentStatus ?? null,
          refetchStatus: e.fetch?.refetchStatus ?? null,
          sourceUrl: e.source.sourceUrl,
        }),
      );

    const durations = partnerRefetch
      .map((r) => r.duration_ms)
      .filter((d): d is number => d != null && d > 0);
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    const successful = events.filter((e) => e.fetchSuccessful).length;
    const attempted = events.filter((e) => e.fetchAttempted).length;
    const failed = attempted - successful;

    const lastSuccess = partnerRuns
      .filter((r) => r.status === "COMPLETED" || r.status === "NO_CHANGE")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const lastFail = partnerRuns
      .filter((r) => ["FAILED", "SOURCE_UNAVAILABLE", "FETCH_FAILED"].includes(r.status))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    results.push({
      partner,
      eligible: events.length,
      fetchAttempted: attempted,
      fetchSuccessful: successful,
      fetchFailed: failed,
      successRate: attempted > 0 ? Math.round((successful / attempted) * 1000) / 10 : null,
      retryCount: Math.max(0, partnerRuns.length - attempted),
      averageFetchDurationMs: avgDuration,
      lastSuccessfulFetch: lastSuccess?.completed_at ?? lastSuccess?.started_at ?? null,
      lastFailedFetch: lastFail?.completed_at ?? lastFail?.started_at ?? null,
      httpErrorDistribution: failureBreakdown(failures),
      timeoutCount: failures.filter((f) => f.errorCode === "TIMEOUT").length,
      dnsTlsFailureCount: failures.filter((f) =>
        ["DNS_ERROR", "TLS_ERROR"].includes(f.errorCode),
      ).length,
      rateLimitCount: failures.filter((f) => f.errorCode === "HTTP_429").length,
      sourceChangedCount: failures.filter((f) => f.errorCode === "SOURCE_CHANGED").length,
      snapshotCoverage: events.filter((e) => e.snapshot.exists).length,
      extractionCoverage: events.filter((e) => e.extraction.state !== "NOT_RUN").length,
      outcomeCoverage: events.filter((e) => e.outcomeState !== "UNKNOWN").length,
      salePriceCoverage: events.filter((e) => e.salePriceState === "VERIFIED").length,
    });
  }

  return results.sort((a, b) => b.eligible - a.eligible);
}
