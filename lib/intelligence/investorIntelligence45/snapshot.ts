/**
 * Investor property snapshot — concise evidence summary.
 */

import type { ComparablePresentation } from "./types";
import type { MarketEvidenceSummary, MarketPosition, PriceEvidenceField } from "./types";
import type { Property } from "@/lib/types/property";
import type { InvestorSnapshot } from "./types";
import { II45_MINIMUM_MARKET_SALES } from "./config";

export function buildInvestorSnapshot(input: {
  property: Property;
  priceEvidence: PriceEvidenceField[];
  summary: MarketEvidenceSummary;
  position: MarketPosition;
  comparables: ComparablePresentation[];
  previousEvents: number;
  outcomes: string[];
  evidenceQuality: string | null;
  trendStatus: string;
}): InvestorSnapshot {
  const p = input.property;
  const compPrices = input.comparables
    .map((c) => c.row.saleEvidence.salePrice)
    .filter((v): v is number => v != null && v > 0);

  const warnings: string[] = [];
  if (input.summary.verifiedSalePriceCount < II45_MINIMUM_MARKET_SALES) {
    warnings.push(
      `Only ${input.summary.verifiedSalePriceCount} verified market sales (minimum ${II45_MINIMUM_MARKET_SALES})`,
    );
  }
  if (input.summary.conflictCount > 0) {
    warnings.push(`${input.summary.conflictCount} open evidence conflict(s)`);
  }
  const missingPrices = input.priceEvidence.filter(
    (f) => f.type === "sale_price" && f.value == null,
  );
  if (missingPrices.length) warnings.push("Verified sale price not supplied");

  return {
    property: {
      propertyType: p.property_type ?? null,
      town: p.town ?? null,
      suburb: p.suburb ?? null,
      floorSize: p.floor_size ?? null,
      bedrooms: p.bedrooms ?? null,
      bathrooms: p.bathrooms ?? null,
      hectares: p.agricultural_details?.totalHectares ?? null,
      auctionDate: p.auction_date ?? null,
      auctionStatus: p.listing_status ?? p.status ?? null,
    },
    priceEvidence: input.priceEvidence,
    historicalEvidence: {
      previousEvents: input.previousEvents,
      outcomes: input.outcomes,
      verifiedPrices: input.summary.verifiedSalePriceCount,
      evidenceQuality: input.evidenceQuality,
    },
    comparableEvidence: {
      acceptedCount: input.comparables.length,
      confidence: input.comparables[0]?.confidenceLabel ?? "Insufficient data",
      median: input.position.comparableMedian,
      range: input.position.comparableRange,
      topExplanations: input.comparables.slice(0, 3).flatMap((c) => c.explanation.slice(0, 4)),
    },
    marketEvidence: {
      areaSampleSize: input.position.actualSample,
      verifiedSales: input.summary.verifiedSalePriceCount,
      median: input.position.areaMedian,
      pricePerM2: input.position.pricePerM2.value,
      pricePerHa: input.position.pricePerHa.value,
      trend: input.trendStatus,
    },
    evidenceWarnings: warnings,
  };
}
