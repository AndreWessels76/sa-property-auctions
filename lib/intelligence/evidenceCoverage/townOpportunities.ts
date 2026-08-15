/**
 * Town acquisition opportunities — ranked path to MARKET_READY.
 * Does NOT fabricate market statistics. Uses verified sale-price counts only.
 */

import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import {
  HI54_MINIMUM_COMPARABLE_SALES,
  HI54_MINIMUM_MARKET_SALES,
} from "@/lib/intelligence/historicalIntelligence54/config";

export type TownAcquisitionPriority = "HIGH" | "MEDIUM" | "LOW" | "READY";

export type TownAcquisitionOpportunity = {
  town: string;
  historicalEvents: number;
  verifiedSales: number;
  verifiedSalePrices: number;
  soldWithoutPrice: number;
  neverAttempted: number;
  licensedSources: number;
  comparableReady: number;
  requiredAdditionalVerifiedSales: number;
  marketReady: boolean;
  priority: TownAcquisitionPriority;
  reason: string;
};

function priorityFor(remaining: number, neverAttempted: number): TownAcquisitionPriority {
  if (remaining <= 0) return "READY";
  if (remaining <= 2 && neverAttempted > 0) return "HIGH";
  if (remaining <= 3) return "HIGH";
  if (remaining <= 4) return "MEDIUM";
  return "LOW";
}

/**
 * Rank towns by closeness to market readiness (threshold = HI54_MINIMUM_MARKET_SALES).
 * Comparable-ready counts are informational only — not used to invent medians.
 */
export function rankTownAcquisitionOpportunities(
  events: Hi50EventRow[],
  options?: {
    marketMinimum?: number;
    comparableMinimum?: number;
  },
): TownAcquisitionOpportunity[] {
  const marketMin = options?.marketMinimum ?? HI54_MINIMUM_MARKET_SALES;
  const comparableMin = options?.comparableMinimum ?? HI54_MINIMUM_COMPARABLE_SALES;

  const byTown = new Map<string, Hi50EventRow[]>();
  for (const e of events) {
    const town = (e.town ?? "").trim() || "UNKNOWN";
    const list = byTown.get(town) ?? [];
    list.push(e);
    byTown.set(town, list);
  }

  const rows: TownAcquisitionOpportunity[] = [];
  for (const [town, townEvents] of byTown) {
    const historicalEvents = townEvents.length;
    const verifiedSalePrices = townEvents.filter((e) => e.salePrice === "VERIFIED").length;
    const verifiedSales = townEvents.filter((e) => e.outcome === "SOLD").length;
    const soldWithoutPrice = townEvents.filter(
      (e) => e.outcome === "SOLD" && e.salePrice !== "VERIFIED",
    ).length;
    const neverAttempted = townEvents.filter((e) => e.attemptNumber <= 0).length;
    const licensedSources = townEvents.filter(
      (e) => (e.sourceStatus ?? "").toUpperCase() === "LICENSED",
    ).length;
    // Comparable-ready proxy: verified sale price + non-review identity
    const comparableReady = townEvents.filter(
      (e) =>
        e.salePrice === "VERIFIED" &&
        e.outcome === "SOLD" &&
        e.resolution !== "REVIEW_REQUIRED" &&
        e.evidenceState !== "CONFLICT",
    ).length;

    const requiredAdditionalVerifiedSales = Math.max(0, marketMin - verifiedSalePrices);
    const marketReady = verifiedSalePrices >= marketMin;
    const priority = priorityFor(requiredAdditionalVerifiedSales, neverAttempted);

    rows.push({
      town,
      historicalEvents,
      verifiedSales,
      verifiedSalePrices,
      soldWithoutPrice,
      neverAttempted,
      licensedSources,
      comparableReady,
      requiredAdditionalVerifiedSales,
      marketReady,
      priority,
      reason: marketReady
        ? `MARKET_READY — ${verifiedSalePrices} verified sale prices (min ${marketMin}); comps signal ${comparableReady}/${comparableMin}`
        : `${requiredAdditionalVerifiedSales} more verified sale price(s) required for MARKET_READY (have ${verifiedSalePrices}/${marketMin})`,
    });
  }

  return rows.sort((a, b) => {
    if (a.marketReady !== b.marketReady) return a.marketReady ? 1 : -1;
    if (a.requiredAdditionalVerifiedSales !== b.requiredAdditionalVerifiedSales) {
      return a.requiredAdditionalVerifiedSales - b.requiredAdditionalVerifiedSales;
    }
    if (a.neverAttempted !== b.neverAttempted) return b.neverAttempted - a.neverAttempted;
    return b.historicalEvents - a.historicalEvents;
  });
}

export type PriorityBucketSummary = {
  p1Remaining: number;
  p2Remaining: number;
  p3Remaining: number;
  p4Blocked: number;
};

/**
 * Remaining work by priority semantics (not raw recoveryPriority alone —
 * HI50 may leave completed fetches at priority 1).
 */
export function summarizePriorityBuckets(events: Hi50EventRow[]): PriorityBucketSummary {
  return {
    p1Remaining: events.filter((e) => e.attemptNumber <= 0).length,
    p2Remaining: events.filter(
      (e) =>
        e.attemptNumber > 0 &&
        (e.retryable || e.failureClassification === "LEGACY_UNKNOWN_FAILURE"),
    ).length,
    p3Remaining: events.filter(
      (e) =>
        e.snapshot === true &&
        (e.extraction === "NOT_RUN" ||
          e.extraction === "MISSING" ||
          e.extraction === "INCOMPLETE"),
    ).length,
    p4Blocked: events.filter((e) => e.recoveryPriority === 4).length,
  };
}
