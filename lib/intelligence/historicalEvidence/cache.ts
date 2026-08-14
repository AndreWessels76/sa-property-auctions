/**
 * HI 4.0 cache keys — include methodology and evidence versions for invalidation.
 */

import { HISTORICAL_INTELLIGENCE40_VERSION } from "./config";
import { COMPARABLE_INTELLIGENCE_VERSION } from "@/lib/intelligence/comparables/config";
import { OUTCOME_INTELLIGENCE_VERSION } from "@/lib/intelligence/outcomes/config";

export function hi40CacheKey(input: {
  scope: "property" | "area" | "agency" | "market" | "comparables";
  scopeId: string;
  dataVersion: string;
  evidenceVersion?: string;
}): string {
  return [
    "hi40",
    input.scope,
    input.scopeId,
    HISTORICAL_INTELLIGENCE40_VERSION,
    COMPARABLE_INTELLIGENCE_VERSION,
    OUTCOME_INTELLIGENCE_VERSION,
    input.dataVersion,
    input.evidenceVersion ?? "none",
  ].join(":");
}

export function dataVersionFromEvents(
  count: number,
  latestDate: string | null,
  evidenceHash: string,
): string {
  return `${count}:${latestDate ?? "none"}:${evidenceHash}`;
}

export function evidenceHashFromScores(scores: Array<{ overallConfidence: string }>): string {
  const summary = scores
    .map((s) => s.overallConfidence[0])
    .join("");
  return `${scores.length}:${summary.slice(0, 32)}`;
}

/** Keys to invalidate when new evidence arrives for a property master. */
export function invalidationScopes(input: {
  propertyId?: string | null;
  propertyMasterId?: string | null;
  town?: string | null;
  agency?: string | null;
}): string[] {
  const keys: string[] = [];
  if (input.propertyId) keys.push(`property:${input.propertyId}`);
  if (input.propertyMasterId) keys.push(`master:${input.propertyMasterId}`);
  if (input.town) keys.push(`area:${input.town.toLowerCase()}`);
  if (input.agency) keys.push(`agency:${input.agency.toLowerCase()}`);
  keys.push("market:global");
  return keys;
}
