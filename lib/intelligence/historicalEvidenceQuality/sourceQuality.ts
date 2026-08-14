/**
 * Source quality hierarchy (HEQ 4.4).
 */

import { rankSourceEvidence } from "@/lib/intelligence/historicalResolution/sourcePriority";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import type { Heq44SourceTier } from "./config";
import type { SourceQualityRecord } from "./types";

function mapTier(
  tier: ReturnType<typeof rankSourceEvidence>,
): Heq44SourceTier | "UNKNOWN" {
  switch (tier) {
    case "OFFICIAL_AUCTIONEER_RESULT":
    case "LICENSED_PARTNER":
      return "LICENSED_OFFICIAL_PARTNER_PAGE";
    case "OFFICIAL_CATALOGUE_DOCUMENT":
      return "LICENSED_AUCTION_CATALOGUE";
    case "OFFICIAL_HISTORICAL_PAGE":
    case "LICENSED_RESULT_FEED":
      return "LICENSED_PARTNER_RESULT_PAGE";
    case "VERIFIED_SNAPSHOT":
      return "PLATFORM_SNAPSHOT";
    case "PERMITTED_EVIDENCE":
      return "SECONDARY_SOURCE";
    default:
      return "UNKNOWN";
  }
}

export function assessSourceQuality(input: {
  event: HistoricalEventObservation;
  outcomeObs?: OutcomeObservationRow | null;
  sourceHash?: string | null;
  fetchedAt?: string | null;
}): SourceQualityRecord {
  const tier = mapTier(
    rankSourceEvidence({
      observation: input.event,
      outcomeObs: input.outcomeObs,
    }),
  );

  return {
    sourceTier: tier,
    sourceAuthority: input.event.agency ?? input.event.sourceName,
    sourceUrl: input.event.sourceUrl,
    snapshotHash: input.sourceHash ?? input.outcomeObs?.source_snapshot_id ?? null,
    retrievedAt: input.fetchedAt ?? input.outcomeObs?.created_at ?? null,
  };
}

export function sourceTierRank(tier: Heq44SourceTier | "UNKNOWN"): number {
  const order: Array<Heq44SourceTier | "UNKNOWN"> = [
    "LICENSED_OFFICIAL_PARTNER_PAGE",
    "LICENSED_AUCTION_CATALOGUE",
    "LICENSED_PARTNER_RESULT_PAGE",
    "PLATFORM_SNAPSHOT",
    "SECONDARY_SOURCE",
    "UNKNOWN",
  ];
  return order.length - order.indexOf(tier);
}
