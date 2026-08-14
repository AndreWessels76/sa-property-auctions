/**
 * Evidence chain provenance (HEQ 4.4).
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { HistoricalEventResolution } from "@/lib/intelligence/historicalResolution/types";
import type { EvidenceChainLink } from "./types";

export function buildEvidenceChain(input: {
  event: HistoricalEventObservation;
  resolution: HistoricalEventResolution;
}): EvidenceChainLink[] {
  const { event, resolution } = input;
  return [
    {
      stage: "Property Master",
      id: event.propertyMasterId,
      label: event.propertyMasterId ? "Linked master" : "Not linked",
      href: event.propertyMasterId
        ? `/admin/operations?propertyMasterId=${event.propertyMasterId}`
        : null,
    },
    {
      stage: "Auction Event",
      id: event.auctionEventId,
      label: event.auctionDate?.slice(0, 10) ?? "Historical event",
      href: event.auctionEventId
        ? `/admin/operations/historical-resolution/${event.auctionEventId}`
        : null,
    },
    {
      stage: "Source",
      id: event.sourceUrl,
      label: event.sourceName ?? event.agency ?? "Source",
      href: event.sourceUrl,
    },
    {
      stage: "Snapshot",
      id: resolution.provenance.snapshotId,
      label: resolution.provenance.sourceHash
        ? `Hash ${resolution.provenance.sourceHash.slice(0, 12)}…`
        : "No snapshot",
      href: null,
    },
    {
      stage: "Extraction",
      id: resolution.provenance.parserVersion,
      label: resolution.provenance.extractedAt ?? "Not extracted",
      href: null,
    },
    {
      stage: "Resolution",
      id: resolution.state,
      label: resolution.label ?? resolution.state,
      href: event.auctionEventId
        ? `/admin/operations/historical-resolution/${event.auctionEventId}`
        : null,
    },
    {
      stage: "Evidence Quality",
      id: resolution.evidenceQuality,
      label: resolution.evidenceQuality,
      href: null,
    },
    {
      stage: "Intelligence",
      id: event.observationId,
      label: "Comparable / market eligibility",
      href: null,
    },
  ];
}
