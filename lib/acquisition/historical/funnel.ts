/**
 * Historical Data Enrichment 4.1 — acquisition funnel metrics.
 */

import { isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { resolveHistoricalSource } from "./sourceResolution";

export type EnrichmentFunnel = {
  historicalEvents: number;
  sourceEligible: number;
  fetchAttempted: number;
  sourceFound: number;
  unchanged: number;
  changed: number;
  outcomeExtracted: number;
  soldConfirmed: number;
  salePriceFound: number;
  salePriceVerified: number;
  comparableReady: number;
  conflicts: number;
  failed: number;
  skippedLicense: number;
  sourceUnavailable: number;
  milestones: {
    firstVerifiedSold: boolean;
    firstVerifiedSalePrice: boolean;
    threeComparableReady: boolean;
    fiveVerifiedSales: boolean;
    tenVerifiedSales: boolean;
    twentyFiveVerifiedSales: boolean;
  };
};

function latestOutcome(
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

function isVerifiedSalePrice(obs: OutcomeObservationRow | null): boolean {
  if (!obs || obs.outcome !== "SOLD") return false;
  if (obs.sale_price == null) return false;
  const conf = (obs.sale_price_confidence ?? "").toLowerCase();
  return conf === "high" || conf === "medium";
}

function comparableReady(
  event: HistoricalEventObservation,
  obs: OutcomeObservationRow | null,
): boolean {
  if (!isVerifiedSalePrice(obs)) return false;
  const hasLocation = Boolean(event.town?.trim() || event.suburb?.trim());
  const hasType = event.propertyTypeStatus === "known" && Boolean(event.propertyType);
  return hasLocation && hasType && Boolean(event.propertyMasterId);
}

export function buildEnrichmentFunnel(input: {
  events: HistoricalEventObservation[];
  observations?: OutcomeObservationRow[];
  runs?: EnrichmentRunRow[];
}): EnrichmentFunnel {
  const observations = input.observations ?? [];
  const runs = input.runs ?? [];

  let sourceEligible = 0;
  let comparableReadyCount = 0;
  let soldConfirmed = 0;
  let salePriceFound = 0;
  let salePriceVerified = 0;
  let outcomeExtracted = 0;

  for (const event of input.events) {
    if (!event.sourceUrl?.trim()) continue;
    const resolution = resolveHistoricalSource({ event });
    if (resolution.status === "ELIGIBLE" || resolution.status === "READY") {
      sourceEligible += 1;
    }
    const obs = latestOutcome(event, observations);
    if (obs && !["UNKNOWN", "COMPLETED_UNKNOWN"].includes(obs.outcome)) {
      outcomeExtracted += 1;
    }
    if (obs?.outcome === "SOLD") soldConfirmed += 1;
    if (obs?.sale_price != null) salePriceFound += 1;
    if (isVerifiedSalePrice(obs)) salePriceVerified += 1;
    if (comparableReady(event, obs)) comparableReadyCount += 1;
  }

  const fetchAttempted = runs.length;
  const sourceFound = runs.filter((r) =>
    ["COMPLETED", "NO_CHANGE", "CONFLICT"].includes(r.status),
  ).length;
  const unchanged = runs.filter((r) => r.status === "NO_CHANGE").length;
  const changed = runs.filter((r) => r.status === "COMPLETED" || r.status === "CONFLICT").length;
  const failed = runs.filter((r) => r.status === "FAILED").length;
  const skippedLicense = runs.filter((r) => r.status === "SKIPPED_LICENSE").length;
  const sourceUnavailable = runs.filter(
    (r) => r.status === "SOURCE_UNAVAILABLE" || r.status === "FETCH_FAILED",
  ).length;
  const conflicts = runs.reduce((a, r) => a + (r.conflicts ?? 0), 0);

  return {
    historicalEvents: input.events.length,
    sourceEligible,
    fetchAttempted,
    sourceFound,
    unchanged,
    changed,
    outcomeExtracted,
    soldConfirmed,
    salePriceFound,
    salePriceVerified,
    comparableReady: comparableReadyCount,
    conflicts,
    failed,
    skippedLicense,
    sourceUnavailable,
    milestones: {
      firstVerifiedSold: soldConfirmed >= 1,
      firstVerifiedSalePrice: salePriceVerified >= 1,
      threeComparableReady: comparableReadyCount >= 3,
      fiveVerifiedSales: salePriceVerified >= 5,
      tenVerifiedSales: salePriceVerified >= 10,
      twentyFiveVerifiedSales: salePriceVerified >= 25,
    },
  };
}

export function hasVerifiedSize(event: HistoricalEventObservation): boolean {
  return (
    isValidPositiveArea(event.floorSizeM2) || isValidPositiveArea(event.hectares)
  );
}
