/**
 * Deterministic historical enrichment queue with priority tiers.
 */

import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import type { EnrichmentRunRow, EnrichmentReviewRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { resolveHistoricalSource, type HistoricalSourceResolution } from "./sourceResolution";

export type QueuePriority = 1 | 2 | 3 | 4;

export type HistoricalQueueItem = {
  priority: QueuePriority;
  propertyId: string;
  auctionEventId: string | null;
  propertyMasterId: string | null;
  town: string | null;
  agency: string | null;
  outcome: string | null;
  salePrice: number | null;
  sourceResolution: HistoricalSourceResolution;
  reason: string;
};

function confirmedOutcome(outcome: string | null | undefined): boolean {
  if (!outcome) return false;
  return !["UNKNOWN", "COMPLETED_UNKNOWN"].includes(outcome);
}

function latestOutcomeForEvent(
  event: HistoricalEventObservation,
  observations: OutcomeObservationRow[],
): OutcomeObservationRow | null {
  const matches = observations.filter(
    (o) =>
      (event.auctionEventId && o.auction_event_id === event.auctionEventId) ||
      (event.listingPropertyId && o.listing_property_id === event.listingPropertyId),
  );
  return matches.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

function lastRunForProperty(
  propertyId: string,
  runs: EnrichmentRunRow[],
): EnrichmentRunRow | null {
  return (
    runs.find((r) => r.property_id === propertyId) ??
    runs.filter((r) => r.property_id === propertyId).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )[0] ??
    null
  );
}

function hasReview(
  event: HistoricalEventObservation,
  reviews: EnrichmentReviewRow[],
): boolean {
  return reviews.some(
    (r) =>
      r.status === "open" &&
      ((event.listingPropertyId && r.property_id === event.listingPropertyId) ||
        (event.auctionEventId && r.auction_event_id === event.auctionEventId)),
  );
}

export function buildHistoricalEnrichmentQueue(input: {
  events: HistoricalEventObservation[];
  observations?: OutcomeObservationRow[];
  recentRuns?: EnrichmentRunRow[];
  openReviews?: EnrichmentReviewRow[];
  filters?: {
    connector?: string;
    agency?: string;
    outcomeState?: string;
  };
}): HistoricalQueueItem[] {
  const observations = input.observations ?? [];
  const runs = input.recentRuns ?? [];
  const reviews = input.openReviews ?? [];
  const items: HistoricalQueueItem[] = [];

  for (const event of input.events) {
    if (!event.listingPropertyId) continue;
    if (
      isPubliclyActiveListing({
        verification_state: event.verificationState,
        data_classification: null,
        listing_status: event.state,
        status: event.state,
        auction_date: event.auctionDate,
      })
    ) {
      continue;
    }
    if (!event.sourceUrl?.trim()) continue;

    if (input.filters?.agency) {
      const needle = input.filters.agency.toLowerCase();
      const agency = (event.agency ?? event.sourceName ?? "").toLowerCase();
      if (!agency.includes(needle)) continue;
    }
    if (input.filters?.connector) {
      const needle = input.filters.connector.toLowerCase();
      if (!(event.sourceUrl ?? "").toLowerCase().includes(needle.replace(/_/g, ""))) continue;
    }

    const obs = latestOutcomeForEvent(event, observations);
    const outcome = obs?.outcome ?? null;
    const salePrice = obs?.sale_price ?? null;
    const lastRun = lastRunForProperty(event.listingPropertyId, runs);
    const openReview = hasReview(event, reviews);

    const sourceResolution = resolveHistoricalSource({
      event,
      lastRunStatus: lastRun?.status ?? null,
      hasOpenReview: openReview,
    });

    if (input.filters?.outcomeState && outcome !== input.filters.outcomeState) continue;

    let priority: QueuePriority;
    let reason: string;

    if (openReview || sourceResolution.status === "REVIEW_REQUIRED") {
      priority = 4;
      reason = "Unresolved conflict / review";
    } else if (
      lastRun?.status === "SOURCE_UNAVAILABLE" ||
      lastRun?.status === "FETCH_FAILED"
    ) {
      priority = 3;
      reason = "Retry — source previously unavailable";
    } else if (confirmedOutcome(outcome) && salePrice == null) {
      priority = 2;
      reason = "Confirmed outcome — missing sale price";
    } else if (!confirmedOutcome(outcome)) {
      priority = 1;
      reason = "No confirmed outcome";
    } else {
      continue;
    }

    if (sourceResolution.status === "LICENSE_BLOCKED") continue;

    items.push({
      priority,
      propertyId: event.listingPropertyId,
      auctionEventId: event.auctionEventId,
      propertyMasterId: event.propertyMasterId,
      town: event.town,
      agency: event.agency ?? event.sourceName,
      outcome,
      salePrice,
      sourceResolution,
      reason,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export function queueSummary(items: HistoricalQueueItem[]) {
  return {
    total: items.length,
    priority1: items.filter((i) => i.priority === 1).length,
    priority2: items.filter((i) => i.priority === 2).length,
    priority3: items.filter((i) => i.priority === 3).length,
    priority4: items.filter((i) => i.priority === 4).length,
    eligible: items.filter((i) => i.sourceResolution.status === "ELIGIBLE").length,
    reviewRequired: items.filter((i) => i.sourceResolution.status === "REVIEW_REQUIRED").length,
  };
}
