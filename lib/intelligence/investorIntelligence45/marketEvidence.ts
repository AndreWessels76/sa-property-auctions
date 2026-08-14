/**
 * Market evidence summary — counts with provenance only.
 */

import { buildSaleEvidence } from "@/lib/intelligence/comparables/saleEvidence";
import { scoreHistoricalEvidence } from "@/lib/intelligence/historicalEvidence/scoring";
import { classifyObservation } from "@/lib/intelligence/outcomes/evidence";
import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { HistoricalEvidenceScore } from "@/lib/intelligence/historicalEvidence/types";
import { INVESTOR_INTELLIGENCE45_VERSION } from "./config";
import type { BuildContext, MarketEvidenceSummary } from "./types";

type ScoredInput = {
  observation: BuildContext["observations"][0];
  classification?: OutcomeClassification;
  score?: HistoricalEvidenceScore;
};

function resolveScored(ctx: BuildContext): ScoredInput[] {
  if (ctx.scoredEvents?.length) {
    return ctx.scoredEvents.map((e) => ({
      observation: e.observation,
      classification: e.classification,
      score: e.score,
    }));
  }
  return ctx.observations.map((observation) => {
    const classification = classifyObservation(observation);
    return {
      observation,
      classification,
      score: scoreHistoricalEvidence(observation, classification),
    };
  });
}

function hasVerifiedSalePrice(row: ScoredInput): boolean {
  const sale = buildSaleEvidence(row.observation);
  return (
    sale.verifiedSale &&
    isValidPositiveAmount(sale.salePrice) &&
    !sale.salePriceConflict &&
    row.classification?.outcome === "SOLD"
  );
}

export function buildMarketEvidenceSummary(ctx: BuildContext): MarketEvidenceSummary {
  const scored = resolveScored(ctx);
  let confirmedSold = 0;
  let confirmedPassedIn = 0;
  let confirmedWithdrawn = 0;
  let confirmedCancelled = 0;
  let unknownOutcomes = 0;
  let verifiedSalePriceCount = 0;
  let verifiedAuctionPriceCount = 0;
  let verifiedSizeEvidenceCount = 0;
  let comparableReadyCount = 0;
  let conflictCount = 0;
  const evidenceQuality = { high: 0, medium: 0, low: 0, insufficient: 0 };
  const sourceQuality: Record<string, number> = {};
  let lastEnrichmentDate: string | null = null;
  let lastEvidenceUpdate: string | null = null;

  for (const row of scored) {
    const o = row.observation;
    const outcome = row.classification?.outcome;
    if (o.conflict) conflictCount++;

    if (outcome === "SOLD" && row.classification?.confirmed) confirmedSold++;
    else if (outcome === "PASSED_IN") confirmedPassedIn++;
    else if (outcome === "WITHDRAWN" || o.state === "withdrawn") confirmedWithdrawn++;
    else if (outcome === "CANCELLED" || o.state === "cancelled") confirmedCancelled++;
    else if (
      outcome === "UNKNOWN" ||
      outcome === "COMPLETED_UNKNOWN" ||
      o.state === "unknown" ||
      o.state === "completed"
    ) {
      unknownOutcomes++;
    }

    if (hasVerifiedSalePrice(row)) verifiedSalePriceCount++;
    if (isValidPositiveAmount(o.prices.auction_price) && o.verified && !o.conflict) {
      verifiedAuctionPriceCount++;
    }
    if (
      (o.floorSizeM2 != null && o.floorSizeM2 > 0) ||
      (o.hectares != null && o.hectares > 0)
    ) {
      verifiedSizeEvidenceCount++;
    }
    if (hasVerifiedSalePrice(row) && o.propertyType) comparableReadyCount++;

    const level = (row.score?.overallConfidence ?? "INSUFFICIENT").toLowerCase();
    if (level === "high") evidenceQuality.high++;
    else if (level === "medium") evidenceQuality.medium++;
    else if (level === "low") evidenceQuality.low++;
    else evidenceQuality.insufficient++;

    const src = o.sourceName ?? "unknown";
    sourceQuality[src] = (sourceQuality[src] ?? 0) + 1;

    if (o.auctionDate && (!lastEnrichmentDate || o.auctionDate > lastEnrichmentDate)) {
      lastEnrichmentDate = o.auctionDate;
    }
    if (o.auctionDate && (!lastEvidenceUpdate || o.auctionDate > lastEvidenceUpdate)) {
      lastEvidenceUpdate = o.auctionDate;
    }
  }

  return {
    historicalEventCount: scored.length,
    confirmedSold,
    confirmedPassedIn,
    confirmedWithdrawn,
    confirmedCancelled,
    unknownOutcomes,
    verifiedSalePriceCount,
    verifiedAuctionPriceCount,
    verifiedSizeEvidenceCount,
    comparableReadyCount,
    evidenceQuality,
    sourceQuality,
    lastEnrichmentDate,
    lastEvidenceUpdate,
    conflictCount,
    provenance: {
      version: INVESTOR_INTELLIGENCE45_VERSION,
      calculatedAt: new Date().toISOString(),
    },
  };
}

export function filterVerifiedSaleObservations(ctx: BuildContext): BuildContext["observations"] {
  return resolveScored(ctx)
    .filter(hasVerifiedSalePrice)
    .map((r) => r.observation);
}
