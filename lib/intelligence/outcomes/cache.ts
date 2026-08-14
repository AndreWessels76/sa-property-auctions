/**
 * Deterministic cache keys for outcome intelligence.
 */

import { OUTCOME_INTELLIGENCE_VERSION } from "./config";

export function outcomeCacheKey(input: {
  scope: string;
  scopeId: string;
  dateRange?: string;
  dataVersion: string;
}): string {
  return [
    "outcomes",
    input.scope,
    input.scopeId,
    input.dateRange ?? "all",
    OUTCOME_INTELLIGENCE_VERSION,
    input.dataVersion,
  ].join(":");
}

export function dataVersionFromCorpus(count: number, latestDate: string | null): string {
  return `${count}:${latestDate ?? "none"}`;
}
