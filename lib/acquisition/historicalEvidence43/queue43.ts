/**
 * HEA 4.3 priority queue — source-discovery driven.
 *
 * P1 — historical + licensed source + exact source URL
 * P2 — historical + licensed partner + strong identity
 * P3 — historical + searchable partner source
 * P4 — historical + weak source discovery
 */

import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { EnrichmentRunRow, EnrichmentReviewRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { discoverSourcesForEvent } from "./sourceDiscovery";
import { assessIdentityMatchStrength } from "./identityResolver";
import type { Hea43QueueItem } from "./types";

export type Hea43QueuePriority = 1 | 2 | 3 | 4;

function lastRunForProperty(
  propertyId: string,
  runs: EnrichmentRunRow[],
): EnrichmentRunRow | null {
  return (
    runs
      .filter((r) => r.property_id === propertyId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
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

function isRetryFailedRun(status: string | null | undefined): boolean {
  return status === "FAILED" || status === "SOURCE_UNAVAILABLE" || status === "FETCH_FAILED";
}

export function buildHea43Queue(input: {
  events: HistoricalEventObservation[];
  observations?: OutcomeObservationRow[];
  recentRuns?: EnrichmentRunRow[];
  openReviews?: EnrichmentReviewRow[];
  filters?: {
    connector?: string;
    agency?: string;
    priority?: Hea43QueuePriority;
    retryFailed?: boolean;
    propertyMasterId?: string;
    auctionEventId?: string;
    partner?: string;
  };
}): Hea43QueueItem[] {
  const runs = input.recentRuns ?? [];
  const reviews = input.openReviews ?? [];
  const items: Hea43QueueItem[] = [];

  for (const event of input.events) {
    if (!event.listingPropertyId) continue;

    if (input.filters?.propertyMasterId && event.propertyMasterId !== input.filters.propertyMasterId) {
      continue;
    }
    if (input.filters?.auctionEventId && event.auctionEventId !== input.filters.auctionEventId) {
      continue;
    }

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

    if (input.filters?.agency) {
      const needle = input.filters.agency.toLowerCase();
      const agency = (event.agency ?? event.sourceName ?? "").toLowerCase();
      if (!agency.includes(needle)) continue;
    }
    if (input.filters?.partner) {
      const needle = input.filters.partner.toLowerCase();
      const agency = (event.agency ?? event.sourceName ?? "").toLowerCase();
      if (!agency.includes(needle)) continue;
    }
    if (input.filters?.connector) {
      const needle = input.filters.connector.toLowerCase();
      if (!(event.sourceUrl ?? "").toLowerCase().includes(needle.replace(/_/g, ""))) continue;
    }

    const lastRun = lastRunForProperty(event.listingPropertyId, runs);
    const openReview = hasReview(event, reviews);
    const retryFailed = isRetryFailedRun(lastRun?.status);

    if (input.filters?.retryFailed && !retryFailed) continue;

    const discovery = discoverSourcesForEvent({
      event,
      lastRunStatus: lastRun?.status ?? null,
      hasOpenReview: openReview,
    });

    if (discovery.resolution.status === "LICENSE_BLOCKED") continue;

    const identity = assessIdentityMatchStrength(event);
    let priority: Hea43QueuePriority;
    let reason: string;

    const exactUrl = Boolean(event.sourceUrl?.trim()) && discovery.candidates.some((c) => c.exactUrlMatch);

    if (exactUrl && discovery.licensed) {
      priority = 1;
      reason = "P1 — exact licensed source URL";
    } else if (discovery.licensed && identity.strength === "strong") {
      priority = 2;
      reason = "P2 — licensed partner + strong identity";
    } else if (discovery.licensed && event.sourceUrl?.trim()) {
      priority = 3;
      reason = "P3 — searchable licensed partner source";
    } else {
      priority = 4;
      reason = "P4 — weak source discovery";
    }

    if (input.filters?.priority != null && priority !== input.filters.priority) continue;

    items.push({
      priority,
      propertyId: event.listingPropertyId,
      auctionEventId: event.auctionEventId,
      propertyMasterId: event.propertyMasterId,
      town: event.town,
      agency: event.agency ?? event.sourceName,
      sourceUrl: event.sourceUrl,
      reason,
      candidates: discovery.candidates,
      identityStrength: identity.strength,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export function hea43QueueSummary(items: Hea43QueueItem[]) {
  return {
    total: items.length,
    priority1: items.filter((i) => i.priority === 1).length,
    priority2: items.filter((i) => i.priority === 2).length,
    priority3: items.filter((i) => i.priority === 3).length,
    priority4: items.filter((i) => i.priority === 4).length,
    strongIdentity: items.filter((i) => i.identityStrength === "strong").length,
    weakIdentity: items.filter((i) => i.identityStrength === "weak").length,
    withSourceUrl: items.filter((i) => Boolean(i.sourceUrl?.trim())).length,
  };
}

export function buildHea43Funnel(input: {
  queue: Hea43QueueItem[];
  results: Array<{ state: string }>;
}): import("./types").Hea43AcquisitionFunnel {
  const results = input.results;
  return {
    eventsRequiringEnrichment: input.queue.length,
    sourcesDiscovered: input.queue.filter((q) => q.candidates.length > 0).length,
    sourcesFetched: results.filter((r) =>
      ["EXTRACTED", "VERIFIED", "NO_CHANGE", "COMPLETED"].includes(r.state),
    ).length,
    httpSuccess: results.filter((r) =>
      ["EXTRACTED", "VERIFIED", "NO_CHANGE", "COMPLETED", "SOURCE_FOUND"].includes(r.state),
    ).length,
    httpFailed: results.filter((r) => r.state === "FETCH_FAILED").length,
    sourceUnavailable: results.filter((r) => r.state === "SOURCE_NOT_FOUND").length,
    licenseBlocked: results.filter((r) => r.state === "LICENSE_BLOCKED").length,
    outcomesExtracted: results.filter((r) =>
      ["EXTRACTED", "VERIFIED"].includes(r.state),
    ).length,
    salePricesExtracted: results.filter((r) => r.state === "VERIFIED").length,
    verified: results.filter((r) => r.state === "VERIFIED").length,
    conflicts: results.filter((r) => r.state === "CONFLICT").length,
    reviewRequired: results.filter((r) => r.state === "REVIEW_REQUIRED").length,
    insufficientData: results.filter((r) => r.state === "INSUFFICIENT_DATA").length,
    notFound: results.filter((r) => r.state === "SOURCE_NOT_FOUND").length,
    noChange: results.filter((r) => r.state === "NO_CHANGE").length,
  };
}
