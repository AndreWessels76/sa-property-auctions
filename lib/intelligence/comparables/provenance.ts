/**
 * Provenance for comparable and market evidence results.
 */

import { COMPARABLE_INTELLIGENCE_VERSION } from "./config";
import type { ComparableProvenance } from "./types";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";

export function provenanceForObservation(
  row: HistoricalEventObservation,
  calculatedAt: string = new Date().toISOString(),
): ComparableProvenance {
  return {
    property_master_id: row.propertyMasterId,
    auction_event_id: row.auctionEventId,
    listing_property_id: row.listingPropertyId,
    source: row.sourceName,
    source_url: row.sourceUrl,
    source_snapshot_id: null,
    pricing_observation_id: null,
    extraction_run_id: null,
    calculated_at: calculatedAt,
    calculation_version: COMPARABLE_INTELLIGENCE_VERSION,
  };
}

export function buildCacheKey(input: {
  propertyMasterId: string | null;
  propertyId: string;
  dataVersion: string;
}): string {
  return [
    "comparables",
    input.propertyId,
    input.propertyMasterId ?? "no-master",
    COMPARABLE_INTELLIGENCE_VERSION,
    input.dataVersion,
  ].join(":");
}

export function dataVersionFromObservations(count: number, latestDate: string | null): string {
  return `${count}:${latestDate ?? "none"}`;
}
