/**
 * Historical source resolution — deterministic eligibility per auction event.
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";

export type HistoricalSourceStatus =
  | "ELIGIBLE"
  | "LICENSE_BLOCKED"
  | "ROBOTS_BLOCKED"
  | "POLICY_BLOCKED"
  | "SOURCE_UNAVAILABLE"
  | "FETCH_FAILED"
  | "READY"
  | "REVIEW_REQUIRED";

export type HistoricalSourceResolution = {
  propertyId: string | null;
  auctionEventId: string | null;
  propertyMasterId: string | null;
  sourceUrl: string | null;
  connector: string | null;
  partner: string | null;
  status: HistoricalSourceStatus;
  lastFetch: string | null;
  lastSnapshotId: string | null;
  sourceHash: string | null;
  notes: string[];
};

export function resolveHistoricalSource(input: {
  event: HistoricalEventObservation;
  lastRunStatus?: string | null;
  hasOpenReview?: boolean;
  hasOpenConflict?: boolean;
}): HistoricalSourceResolution {
  const notes: string[] = [];
  const sourceUrl = input.event.sourceUrl;
  const partner = input.event.agency ?? input.event.sourceName ?? null;
  const connector = sourceUrl?.includes("bidderschoice") ? "bidders_choice" : partner;

  if (input.hasOpenConflict || input.hasOpenReview) {
    return {
      propertyId: input.event.listingPropertyId,
      auctionEventId: input.event.auctionEventId,
      propertyMasterId: input.event.propertyMasterId,
      sourceUrl,
      connector,
      partner,
      status: "REVIEW_REQUIRED",
      lastFetch: null,
      lastSnapshotId: null,
      sourceHash: null,
      notes: ["Open conflict or review item"],
    };
  }

  if (!sourceUrl?.trim()) {
    notes.push("No source URL");
    return {
      propertyId: input.event.listingPropertyId,
      auctionEventId: input.event.auctionEventId,
      propertyMasterId: input.event.propertyMasterId,
      sourceUrl: null,
      connector,
      partner,
      status: "SOURCE_UNAVAILABLE",
      lastFetch: null,
      lastSnapshotId: null,
      sourceHash: null,
      notes,
    };
  }

  const run = (input.lastRunStatus ?? "").toUpperCase();
  if (run.includes("SKIPPED_LICENSE") || run === "LICENSE_BLOCKED") {
    return {
      propertyId: input.event.listingPropertyId,
      auctionEventId: input.event.auctionEventId,
      propertyMasterId: input.event.propertyMasterId,
      sourceUrl,
      connector,
      partner,
      status: "LICENSE_BLOCKED",
      lastFetch: null,
      lastSnapshotId: null,
      sourceHash: null,
      notes: ["Licence blocked"],
    };
  }
  if (run.includes("ROBOTS") || run === "ROBOTS_BLOCKED") {
    return {
      propertyId: input.event.listingPropertyId,
      auctionEventId: input.event.auctionEventId,
      propertyMasterId: input.event.propertyMasterId,
      sourceUrl,
      connector,
      partner,
      status: "ROBOTS_BLOCKED",
      lastFetch: null,
      lastSnapshotId: null,
      sourceHash: null,
      notes: ["Robots policy blocked"],
    };
  }
  if (run === "SOURCE_UNAVAILABLE" || run === "FAILED" || run === "FETCH_FAILED") {
    return {
      propertyId: input.event.listingPropertyId,
      auctionEventId: input.event.auctionEventId,
      propertyMasterId: input.event.propertyMasterId,
      sourceUrl,
      connector,
      partner,
      status: run === "FAILED" ? "FETCH_FAILED" : "SOURCE_UNAVAILABLE",
      lastFetch: null,
      lastSnapshotId: null,
      sourceHash: null,
      notes: [`Previous run: ${run}`],
    };
  }

  return {
    propertyId: input.event.listingPropertyId,
    auctionEventId: input.event.auctionEventId,
    propertyMasterId: input.event.propertyMasterId,
    sourceUrl,
    connector,
    partner,
    status: "ELIGIBLE",
    lastFetch: null,
    lastSnapshotId: null,
    sourceHash: null,
    notes,
  };
}
