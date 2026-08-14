/**
 * Distinguish legacy enrichment runs with missing error metadata from explicit failures.
 */

import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import type { Hi50FailureClassification } from "./types";

function parseMeta(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

export function classifyFailureMetadata(input: {
  enrichmentRun: EnrichmentRunRow | null;
  fetchAttempted: boolean;
  fetchSuccessful: boolean;
  errorCode?: string | null;
  httpStatus?: number | null;
}): Hi50FailureClassification {
  if (!input.fetchAttempted || input.fetchSuccessful) return "NONE";

  const meta = parseMeta(input.enrichmentRun?.meta);
  const hasExplicitMeta =
    typeof meta.httpStatus === "number" ||
    (typeof meta.errorCode === "string" && meta.errorCode !== "") ||
    (typeof meta.error === "string" && meta.error !== "");

  if (hasExplicitMeta || input.httpStatus != null) {
    return "NEW_RUN_WITH_EXPLICIT_ERROR";
  }

  if (input.errorCode && input.errorCode !== "CONTENT_UNAVAILABLE" && input.errorCode !== "NONE") {
    return "NEW_RUN_WITH_EXPLICIT_ERROR";
  }

  return "LEGACY_UNKNOWN_FAILURE";
}

export function countLegacyFailures(
  events: Array<{
    fetchAttempted: boolean;
    fetchSuccessful: boolean;
    failureClassification: Hi50FailureClassification;
  }>,
): number {
  return events.filter(
    (e) =>
      e.fetchAttempted &&
      !e.fetchSuccessful &&
      e.failureClassification === "LEGACY_UNKNOWN_FAILURE",
  ).length;
}
