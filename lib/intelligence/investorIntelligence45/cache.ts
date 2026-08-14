/**
 * Deterministic cache keys for Investor Intelligence 4.5.
 */

import { INVESTOR_INTELLIGENCE45_VERSION } from "./config";

export function buildInvestorCacheKey(
  scope: string,
  id: string,
  evidenceVersion: string = "evidence-v1",
): string {
  return `${INVESTOR_INTELLIGENCE45_VERSION}:${scope}:${id}:${evidenceVersion}`;
}

export function buildCacheMeta(evidenceVersion?: string) {
  return {
    version: INVESTOR_INTELLIGENCE45_VERSION,
    evidenceVersion: evidenceVersion ?? "evidence-v1",
    calculatedAt: new Date().toISOString(),
  };
}
