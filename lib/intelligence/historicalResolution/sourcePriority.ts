/**
 * Deterministic source evidence hierarchy (HI 4.2).
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import type { SourceEvidenceTier } from "./types";

export function rankSourceEvidence(input: {
  observation: HistoricalEventObservation;
  outcomeObs?: OutcomeObservationRow | null;
}): SourceEvidenceTier {
  const evidenceType = (input.outcomeObs?.evidence_type ?? "").toLowerCase();
  const extractionMethod = (input.outcomeObs?.extraction_method ?? "").toLowerCase();

  if (evidenceType.includes("admin") || evidenceType.includes("partner_confirmed")) {
    return "LICENSED_PARTNER";
  }
  if (evidenceType.includes("document")) {
    return "OFFICIAL_CATALOGUE_DOCUMENT";
  }
  if (input.observation.sourceUnit === "auction_event") {
    return "OFFICIAL_AUCTIONEER_RESULT";
  }
  if (input.outcomeObs?.source_snapshot_id) {
    return "VERIFIED_SNAPSHOT";
  }
  if (input.observation.sourceUrl?.includes("bidderschoice") || input.observation.verified) {
    return "OFFICIAL_HISTORICAL_PAGE";
  }
  if (extractionMethod.includes("structured") || extractionMethod.includes("partner")) {
    return "LICENSED_RESULT_FEED";
  }
  if (input.observation.sourceUrl) {
    return "PERMITTED_EVIDENCE";
  }
  return "UNKNOWN";
}

export function sourceTierScore(tier: SourceEvidenceTier): number {
  const order: SourceEvidenceTier[] = [
    "OFFICIAL_AUCTIONEER_RESULT",
    "OFFICIAL_HISTORICAL_PAGE",
    "OFFICIAL_CATALOGUE_DOCUMENT",
    "LICENSED_PARTNER",
    "LICENSED_RESULT_FEED",
    "VERIFIED_SNAPSHOT",
    "PERMITTED_EVIDENCE",
    "UNKNOWN",
  ];
  return order.length - order.indexOf(tier);
}
