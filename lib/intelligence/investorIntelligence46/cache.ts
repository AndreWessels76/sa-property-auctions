/**
 * II 4.6 cache keys — deterministic, no user auth in key.
 */

import { INVESTOR_INTELLIGENCE46_VERSION } from "./config";

export function buildInvestor46CacheKey(
  propertyId: string,
  evidenceVersion: string,
  intelligenceVersion: string = INVESTOR_INTELLIGENCE46_VERSION,
): string {
  return `${intelligenceVersion}:property:${propertyId}:${evidenceVersion}`;
}
