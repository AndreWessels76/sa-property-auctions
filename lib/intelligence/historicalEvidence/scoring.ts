/**
 * Deterministic historical evidence quality scoring — never upgrades low confidence to verified.
 */

import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import { isConfirmedOutcome } from "@/lib/intelligence/outcomes/classification";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { PricingObservationRow } from "@/lib/repositories/PricingObservationRepository";
import {
  HI40_MINIMUM_COMPARABLE_SALES,
  HI40_MINIMUM_MARKET_SALES,
  type EvidenceConfidenceLevel,
} from "./config";
import type { EvidenceDimensionScore, HistoricalEvidenceScore } from "./types";

function levelFromScore(score: number, high = 3, medium = 2): EvidenceConfidenceLevel {
  if (score >= high) return "HIGH";
  if (score >= medium) return "MEDIUM";
  if (score >= 1) return "LOW";
  return "INSUFFICIENT";
}

function dim(level: EvidenceConfidenceLevel, reason: string): EvidenceDimensionScore {
  return { level, reason };
}

function scoreOutcome(row: HistoricalEventObservation, c: OutcomeClassification): EvidenceDimensionScore {
  if (row.conflict || c.salePrice.conflict) return dim("INSUFFICIENT", "Outcome conflict — requires admin review");
  if (c.outcome === "UNKNOWN" || c.outcome === "COMPLETED_UNKNOWN") {
    return dim("INSUFFICIENT", "No confirmed outcome evidence");
  }
  if (c.outcomeEvidence.confidence === "high" && c.confirmed) {
    return dim("HIGH", `Confirmed ${c.outcome} with event-backed evidence`);
  }
  if (c.confirmed) return dim("MEDIUM", `Confirmed ${c.outcome} — limited source evidence`);
  return dim("LOW", `Outcome ${c.outcome} not fully confirmed`);
}

function scoreSalePrice(c: OutcomeClassification): EvidenceDimensionScore {
  if (c.salePrice.conflict) return dim("INSUFFICIENT", "Sale price conflict");
  const conf = c.salePrice.salePriceConfidence;
  if (conf === "high" && isValidPositiveAmount(c.salePrice.salePrice)) {
    return dim("HIGH", "Explicit verified sale price");
  }
  if (conf === "medium" && isValidPositiveAmount(c.salePrice.salePrice)) {
    return dim("MEDIUM", "Sale price with source context");
  }
  if (c.outcome === "SOLD" && !isValidPositiveAmount(c.salePrice.salePrice)) {
    return dim("INSUFFICIENT", "SOLD without verified sale price");
  }
  if (isValidPositiveAmount(c.salePrice.salePrice)) return dim("LOW", "Price present but ambiguous context");
  return dim("INSUFFICIENT", "No verified sale price");
}

function scoreSource(row: HistoricalEventObservation): EvidenceDimensionScore {
  if (row.conflict) return dim("INSUFFICIENT", "Conflicting sources");
  if (row.sourceUrl && row.verified) return dim("HIGH", "Licensed source URL with verified listing");
  if (row.sourceUrl) return dim("MEDIUM", "Source URL present");
  if (row.sourceName) return dim("LOW", "Agency/source name only");
  return dim("INSUFFICIENT", "No source evidence");
}

function scoreDate(row: HistoricalEventObservation): EvidenceDimensionScore {
  if (row.auctionDate && row.dateKind === "auction_date") return dim("HIGH", "Verified auction date");
  if (row.auctionDate) return dim("MEDIUM", "Auction date present");
  return dim("INSUFFICIENT", "Auction date not supplied");
}

function scoreIdentity(row: HistoricalEventObservation): EvidenceDimensionScore {
  let s = 0;
  if (row.propertyMasterId) s += 2;
  if (row.auctionEventId) s += 2;
  if (row.verified && !row.conflict) s += 1;
  if (row.propertyTypeStatus === "known") s += 1;
  return dim(levelFromScore(s, 5, 3), row.propertyMasterId ? "Property Master linked" : "No Property Master");
}

function scoreLocation(row: HistoricalEventObservation): EvidenceDimensionScore {
  let s = 0;
  if (row.suburb?.trim()) s += 2;
  if (row.town?.trim()) s += 2;
  if (row.municipality?.trim()) s += 1;
  if (row.province?.trim()) s += 1;
  if (s >= 4) return dim("HIGH", "Suburb and town verified");
  if (s >= 2) return dim("MEDIUM", "Town-level location");
  if (s >= 1) return dim("LOW", "Province only");
  return dim("INSUFFICIENT", "Insufficient location data");
}

function scorePricing(row: HistoricalEventObservation, c: OutcomeClassification): EvidenceDimensionScore {
  const hasSale = isValidPositiveAmount(c.salePrice.salePrice);
  const hasAuction = isValidPositiveAmount(row.prices.auction_price);
  const hasGuide = isValidPositiveAmount(row.prices.guide_price);
  if (hasSale && c.salePrice.salePriceConfidence !== "low") {
    return dim("HIGH", "Verified sale price semantics preserved");
  }
  if (hasAuction || hasGuide) return dim("MEDIUM", "Non-sale pricing fields only");
  return dim("INSUFFICIENT", "No verified pricing evidence");
}

function scoreDocumentation(row: HistoricalEventObservation, pricingObs: PricingObservationRow[]): EvidenceDimensionScore {
  const obs = pricingObs.filter(
    (o) =>
      (row.auctionEventId && o.auction_event_id === row.auctionEventId) ||
      (row.listingPropertyId && o.property_id === row.listingPropertyId),
  );
  if (obs.some((o) => o.source_snapshot_id)) return dim("HIGH", "Source snapshot linked");
  if (obs.length > 0) return dim("MEDIUM", "Pricing observations persisted");
  if (row.sourceUrl) return dim("LOW", "Source URL only");
  return dim("INSUFFICIENT", "No documentation evidence");
}

function overallFromDimensions(dims: EvidenceDimensionScore[]): EvidenceConfidenceLevel {
  const levels = dims.map((d) => d.level);
  if (levels.every((l) => l === "HIGH")) return "HIGH";
  if (levels.filter((l) => l === "INSUFFICIENT").length >= 4) return "INSUFFICIENT";
  const scores = levels.map((l): number =>
    l === "HIGH" ? 3 : l === "MEDIUM" ? 2 : l === "LOW" ? 1 : 0,
  );
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 2.5) return "HIGH";
  if (avg >= 1.5) return "MEDIUM";
  if (avg >= 0.75) return "LOW";
  return "INSUFFICIENT";
}

function acquisitionGaps(row: HistoricalEventObservation, c: OutcomeClassification): string[] {
  const gaps: string[] = [];
  if (!isConfirmedOutcome(c.outcome)) gaps.push("outcome");
  if (c.outcome === "SOLD" && !isValidPositiveAmount(c.salePrice.salePrice)) gaps.push("sale_price");
  if (!isValidPositiveArea(row.floorSizeM2) && !isValidPositiveArea(row.hectares)) gaps.push("size");
  if (!row.town && !row.suburb) gaps.push("location");
  if (!row.sourceUrl) gaps.push("source");
  return gaps;
}

export function scoreHistoricalEvidence(
  row: HistoricalEventObservation,
  classification: OutcomeClassification,
  pricingObs: PricingObservationRow[] = [],
): HistoricalEvidenceScore {
  const outcomeEvidence = scoreOutcome(row, classification);
  const salePriceEvidence = scoreSalePrice(classification);
  const sourceEvidence = scoreSource(row);
  const dateEvidence = scoreDate(row);
  const identityConfidence = scoreIdentity(row);
  const locationConfidence = scoreLocation(row);
  const pricingConfidence = scorePricing(row, classification);
  const documentationConfidence = scoreDocumentation(row, pricingObs);

  const dims = [
    outcomeEvidence,
    salePriceEvidence,
    sourceEvidence,
    dateEvidence,
    identityConfidence,
    locationConfidence,
    pricingConfidence,
    documentationConfidence,
  ];
  const overallConfidence = overallFromDimensions(dims);

  const comparableReady =
    classification.outcome === "SOLD" &&
    salePriceEvidence.level !== "INSUFFICIENT" &&
    locationConfidence.level !== "INSUFFICIENT" &&
    identityConfidence.level !== "INSUFFICIENT" &&
    !row.conflict &&
    !classification.salePrice.conflict;

  const marketStatisticsReady =
    comparableReady && salePriceEvidence.level !== "LOW";

  const gaps = acquisitionGaps(row, classification);

  return {
    observationId: row.observationId,
    auctionEventId: row.auctionEventId,
    propertyMasterId: row.propertyMasterId,
    listingPropertyId: row.listingPropertyId,
    outcomeEvidence,
    salePriceEvidence,
    sourceEvidence,
    dateEvidence,
    identityConfidence,
    locationConfidence,
    pricingConfidence,
    documentationConfidence,
    overallConfidence,
    overallReason:
      overallConfidence === "INSUFFICIENT"
        ? "Insufficient verified evidence across one or more dimensions"
        : `${overallConfidence} confidence from deterministic evidence scoring`,
    comparableReady,
    marketStatisticsReady,
    acquisitionGaps: gaps,
  };
}

export function evidenceQualityBonus(level: EvidenceConfidenceLevel): number {
  switch (level) {
    case "HIGH":
      return 8;
    case "MEDIUM":
      return 4;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

export { HI40_MINIMUM_COMPARABLE_SALES, HI40_MINIMUM_MARKET_SALES };
