/**
 * Fetch diagnostics from enrichment runs + refetch audit rows.
 * Never expose credentials or secrets.
 */

import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import type { RefetchRunRow } from "@/lib/acquisition/refetch/refetchAudit";
import { classifyFetchError } from "./diagnosticStates";
import type { Hsc48FetchDiagnostic } from "./types";

function parseMeta(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

function redactSecrets(text: string | null | undefined): string | null {
  if (!text) return null;
  return text
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
    .replace(/api[_-]?key[=:]\s*\S+/gi, "api_key=[REDACTED]")
    .slice(0, 500);
}

function classifyErrorFields(error: string | null): {
  networkError: string | null;
  tlsError: string | null;
  dnsError: string | null;
  timeout: boolean;
} {
  const err = (error ?? "").toLowerCase();
  if (err.includes("tls") || err.includes("certificate")) {
    return { networkError: null, tlsError: redactSecrets(error), dnsError: null, timeout: false };
  }
  if (err.includes("enotfound") || err.includes("dns") || err.includes("getaddrinfo")) {
    return { networkError: null, tlsError: null, dnsError: redactSecrets(error), timeout: false };
  }
  if (err.includes("timeout") || err.includes("etimedout") || err.includes("aborted")) {
    return { networkError: null, tlsError: null, dnsError: null, timeout: true };
  }
  return {
    networkError: redactSecrets(error),
    tlsError: null,
    dnsError: null,
    timeout: false,
  };
}

export function latestEnrichmentRunForProperty(
  propertyId: string | null | undefined,
  runs: EnrichmentRunRow[],
): EnrichmentRunRow | null {
  if (!propertyId) return null;
  return (
    runs
      .filter((r) => r.property_id === propertyId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  );
}

export function latestRefetchRunForProperty(
  propertyId: string | null | undefined,
  refetchRuns: RefetchRunRow[],
): RefetchRunRow | null {
  if (!propertyId) return null;
  return (
    refetchRuns
      .filter((r) => r.property_id === propertyId)
      .sort((a, b) =>
        (b.started_at ?? "").localeCompare(a.started_at ?? ""),
      )[0] ?? null
  );
}

export function buildFetchDiagnostic(input: {
  eventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
  sourceUrl: string | null;
  agency: string | null;
  enrichmentRun: EnrichmentRunRow | null;
  refetchRun: RefetchRunRow | null;
}): Hsc48FetchDiagnostic | null {
  if (!input.enrichmentRun && !input.refetchRun) return null;

  const meta = parseMeta(input.enrichmentRun?.meta);
  const refetchStatus =
    (meta.refetchStatus as string | undefined) ??
    input.refetchRun?.status ??
    null;
  const enrichmentStatus = input.enrichmentRun?.status ?? null;
  const error =
    (meta.error as string | undefined) ??
    input.refetchRun?.error ??
    null;
  const httpStatus =
    input.refetchRun?.http_status ??
    (typeof meta.httpStatus === "number" ? meta.httpStatus : null);

  const errFields = classifyErrorFields(error);
  const durationMs =
    (meta.durationMs as number | undefined) ??
    input.refetchRun?.duration_ms ??
    null;

  const responseReceived =
    httpStatus != null ||
    enrichmentStatus === "COMPLETED" ||
    enrichmentStatus === "NO_CHANGE" ||
    Boolean(input.enrichmentRun?.snapshot_id);

  const contentLength =
    typeof meta.contentLength === "number"
      ? meta.contentLength
      : input.refetchRun?.content_hash
        ? null
        : null;

  return {
    eventId: input.eventId,
    propertyMasterId: input.propertyMasterId,
    listingPropertyId: input.listingPropertyId,
    sourceUrl: input.sourceUrl ?? input.enrichmentRun?.source_url ?? input.refetchRun?.source_url ?? null,
    agency: input.agency,
    attemptTimestamp:
      input.enrichmentRun?.started_at ??
      input.refetchRun?.started_at ??
      null,
    httpStatus,
    responseReceived,
    contentLength,
    redirectCount: typeof meta.redirectCount === "number" ? meta.redirectCount : null,
    finalUrl: typeof meta.finalUrl === "string" ? meta.finalUrl : null,
    ...errFields,
    licenseDecision:
      enrichmentStatus === "SKIPPED_LICENSE" || refetchStatus === "SKIPPED_LICENSE"
        ? "BLOCKED"
        : refetchStatus === "SKIPPED_ROBOTS"
          ? "ROBOTS_BLOCKED"
          : null,
    robotsDecision: refetchStatus === "SKIPPED_ROBOTS" ? "BLOCKED" : null,
    fetchDurationMs: durationMs,
    snapshotResult: input.enrichmentRun?.snapshot_id ? "CREATED" : enrichmentStatus === "NO_CHANGE" ? "NO_CHANGE" : null,
    enrichmentStatus,
    refetchStatus,
  };
}

export function isFetchSuccessful(input: {
  enrichmentStatus: string | null;
  refetchStatus: string | null;
}): boolean {
  return (
    input.enrichmentStatus === "COMPLETED" ||
    input.enrichmentStatus === "NO_CHANGE" ||
    input.refetchStatus === "completed" ||
    input.refetchStatus === "no_change"
  );
}

export function isFetchFailed(input: {
  enrichmentStatus: string | null;
  refetchStatus: string | null;
  fetchDiagnostic: Hsc48FetchDiagnostic | null;
}): boolean {
  if (isFetchSuccessful(input)) return false;
  if (!input.fetchDiagnostic) return false;
  const failedStatuses = [
    "FAILED",
    "FETCH_FAILED",
    "SOURCE_UNAVAILABLE",
    "SKIPPED_LICENSE",
  ];
  if (input.enrichmentStatus && failedStatuses.includes(input.enrichmentStatus)) {
    return true;
  }
  if (input.refetchStatus === "failed" || input.refetchStatus === "source_unavailable") {
    return true;
  }
  return classifyFetchError({
    enrichmentStatus: input.enrichmentStatus,
    refetchStatus: input.refetchStatus,
    httpStatus: input.fetchDiagnostic.httpStatus,
    error:
      input.fetchDiagnostic.networkError ??
      input.fetchDiagnostic.tlsError ??
      input.fetchDiagnostic.dnsError ??
      null,
  }) != null;
}
