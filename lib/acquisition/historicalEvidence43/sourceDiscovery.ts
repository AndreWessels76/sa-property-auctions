/**
 * Source discovery for historical auction events (HEA 4.3).
 */

import { resolveHistoricalSource } from "@/lib/acquisition/historical/sourceResolution";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import { searchHistoricalSources } from "./historicalSearch";
import { identityReviewRequired } from "./identityResolver";
import type { Hea43SourceCandidate } from "./types";

export function discoverSourcesForEvent(input: {
  event: HistoricalEventObservation;
  lastRunStatus?: string | null;
  hasOpenReview?: boolean;
  externalListingId?: string | null;
  /** Clear sticky prior SKIPPED_LICENSE when live permission allows retry. */
  allowLicenceRetry?: boolean;
}): {
  candidates: Hea43SourceCandidate[];
  licensed: boolean;
  sourceFound: boolean;
  identityReviewRequired: boolean;
  resolution: ReturnType<typeof resolveHistoricalSource>;
} {
  const resolution = resolveHistoricalSource({
    event: input.event,
    lastRunStatus: input.lastRunStatus,
    hasOpenReview: input.hasOpenReview,
    allowLicenceRetry: input.allowLicenceRetry,
  });

  const candidates = searchHistoricalSources({
    event: input.event,
    externalListingId: input.externalListingId,
  }).filter((c) => c.licensed);

  const identityBlocked = candidates.some((c) =>
    identityReviewRequired(c.identityStrength),
  );

  return {
    candidates,
    licensed: resolution.status !== "LICENSE_BLOCKED" && resolution.status !== "ROBOTS_BLOCKED",
    sourceFound: candidates.length > 0 && resolution.status === "ELIGIBLE",
    identityReviewRequired: identityBlocked && !input.event.propertyMasterId,
    resolution,
  };
}
