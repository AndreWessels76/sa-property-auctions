import type { RefetchRunRow } from "@/lib/acquisition/refetch/refetchAudit";
import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { classifyFetchAttempt } from "./fetchClassifier";
import type { FetchReliabilityState } from "./fetchFailureCodes";

export type NormalizedFetchAudit = {
  eventId: string | null;
  propertyId: string | null;
  sourceUrl: string | null;
  attemptNumber: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  httpStatus: number | null;
  fetchState: FetchReliabilityState;
  errorCode: string;
  retryable: boolean;
  retryReason: string;
  snapshotId: string | null;
  contentHash: string | null;
  runId: string | null;
  refetchRunCode: string | null;
};

function parseMeta(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

export function normalizeFetchAudit(input: {
  enrichmentRun: EnrichmentRunRow | null;
  refetchRun: RefetchRunRow | null;
  enrichmentRuns: EnrichmentRunRow[];
  eventId?: string | null;
}): NormalizedFetchAudit | null {
  if (!input.enrichmentRun && !input.refetchRun) return null;

  const meta = parseMeta(input.enrichmentRun?.meta);
  const propertyId = input.enrichmentRun?.property_id ?? input.refetchRun?.property_id ?? null;
  if (!propertyId) return null;

  const httpStatus =
    (meta.httpStatus as number | undefined) ??
    input.refetchRun?.http_status ??
    null;
  const error = (meta.error as string | undefined) ?? input.refetchRun?.error ?? null;
  const enrichmentStatus = input.enrichmentRun?.status ?? null;
  const refetchStatus =
    (meta.refetchStatus as string | undefined) ?? input.refetchRun?.status ?? null;
  const fetchSuccessful =
    enrichmentStatus === "COMPLETED" ||
    enrichmentStatus === "NO_CHANGE" ||
    refetchStatus === "completed" ||
    refetchStatus === "no_change";
  const noChange = enrichmentStatus === "NO_CHANGE" || refetchStatus === "no_change";

  const classified = classifyFetchAttempt({
    propertyId,
    enrichmentRuns: input.enrichmentRuns,
    error,
    httpStatus,
    enrichmentStatus,
    refetchStatus,
    contentLength: meta.contentLength as number | undefined,
    sourceUrl: input.enrichmentRun?.source_url ?? input.refetchRun?.source_url ?? null,
    fetchSuccessful,
    noChange,
  });

  return {
    eventId: input.eventId ?? input.enrichmentRun?.auction_event_id ?? null,
    propertyId,
    sourceUrl: input.enrichmentRun?.source_url ?? input.refetchRun?.source_url ?? null,
    attemptNumber: classified.retryDecision.attemptNumber,
    startedAt: input.enrichmentRun?.started_at ?? input.refetchRun?.started_at ?? null,
    completedAt: input.enrichmentRun?.completed_at ?? input.refetchRun?.completed_at ?? null,
    durationMs:
      (meta.durationMs as number | undefined) ?? input.refetchRun?.duration_ms ?? null,
    httpStatus,
    fetchState: classified.fetchState,
    errorCode: classified.errorCode,
    retryable: classified.retryable,
    retryReason: classified.retryDecision.reason,
    snapshotId: input.enrichmentRun?.snapshot_id ?? null,
    contentHash: input.enrichmentRun?.source_hash ?? input.refetchRun?.content_hash ?? null,
    runId: input.enrichmentRun?.run_id ?? null,
    refetchRunCode: input.refetchRun?.run_code ?? null,
  };
}
