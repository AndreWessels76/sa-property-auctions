/**
 * Investor research snapshot assembly (II 4.6).
 */

import type { ComparablePresentation } from "@/lib/intelligence/investorIntelligence45/types";
import type { BuildContext } from "@/lib/intelligence/investorIntelligence45/types";
import type { Property } from "@/lib/types/property";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import { buildEvidenceCoverage, stableSortByField } from "./evidenceCoverage";
import {
  buildAuctionFields,
  buildPhysicalPropertyFields,
  buildPricingFields,
  buildPropertyIdentityFields,
} from "./fieldEvidence";
import type {
  AcquisitionGap46,
  FieldEvidence,
  InvestorResearchSnapshot,
  ResearchEvidenceSummary,
} from "./types";
import { II46_MINIMUM_COMPARABLE_SALES, II46_MINIMUM_MARKET_SALES } from "./config";

function historicalFields(
  observation: HistoricalEventObservation | null,
  eventCount: number,
): FieldEvidence[] {
  if (!observation) {
    return [
      {
        field: "historicalEvents",
        value: eventCount,
        status: eventCount > 0 ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
        source: null,
        sourceUrl: null,
        observedAt: null,
        confidence: eventCount > 0 ? "MEDIUM" : "INSUFFICIENT_DATA",
      },
    ];
  }
  return [
    {
      field: "outcome",
      value: observation.state,
      status: observation.state === "sold" ? "VERIFIED" : observation.state === "unknown" ? "INSUFFICIENT_DATA" : "SOURCE_CONFIRMED",
      source: observation.sourceName,
      sourceUrl: observation.sourceUrl,
      observedAt: observation.auctionDate,
      confidence: observation.verified ? "HIGH" : "LOW",
    },
    {
      field: "salePriceEvidence",
      value: observation.prices.sale_price,
      status:
        observation.prices.sale_price != null && observation.state === "sold"
          ? "VERIFIED"
          : "NOT_SUPPLIED",
      source: observation.sourceName,
      sourceUrl: observation.sourceUrl,
      observedAt: observation.auctionDate,
      confidence: observation.prices.sale_price != null ? "HIGH" : "INSUFFICIENT_DATA",
    },
  ];
}

export function buildResearchSnapshot(input: {
  property: Property;
  ctx: BuildContext;
  observation: HistoricalEventObservation | null;
  comparables: ComparablePresentation[];
  rejectedCount: number;
  verifiedSales: number;
  areaMedian: number | null;
  comparableMedian: number | null;
  decisionStatus: string;
  decisionReasons: string[];
  acquisitionGaps: AcquisitionGap46[];
  hasConflict: boolean;
}): InvestorResearchSnapshot {
  const identity = buildPropertyIdentityFields(input.property, input.observation);
  const physical = buildPhysicalPropertyFields(input.property);
  const auction = buildAuctionFields(input.property);
  const pricing = buildPricingFields(input.property, input.observation);
  const historical = historicalFields(input.observation, input.ctx.observations.length);

  const compFields: FieldEvidence[] = [
    {
      field: "acceptedComparables",
      value: input.comparables.length,
      status: input.comparables.length >= II46_MINIMUM_COMPARABLE_SALES ? "VERIFIED" : input.comparables.length > 0 ? "EXTRACTED" : "INSUFFICIENT_DATA",
      source: null,
      sourceUrl: null,
      observedAt: null,
      confidence: input.comparables[0]?.confidenceLabel ?? "INSUFFICIENT_DATA",
    },
    {
      field: "rejectedComparables",
      value: input.rejectedCount,
      status: "FACT",
      source: null,
      sourceUrl: null,
      observedAt: null,
      confidence: "HIGH",
    },
  ];

  const marketFields: FieldEvidence[] = [
    {
      field: "verifiedAreaSales",
      value: input.verifiedSales,
      status: input.verifiedSales >= II46_MINIMUM_MARKET_SALES ? "VERIFIED" : "INSUFFICIENT_DATA",
      source: null,
      sourceUrl: null,
      observedAt: null,
      confidence: input.verifiedSales >= II46_MINIMUM_MARKET_SALES ? "HIGH" : "INSUFFICIENT_DATA",
    },
    {
      field: "areaMedian",
      value: input.areaMedian,
      status: input.areaMedian != null ? "CALCULATED" : "INSUFFICIENT_DATA",
      source: null,
      sourceUrl: null,
      observedAt: null,
      confidence: input.areaMedian != null ? "HIGH" : "INSUFFICIENT_DATA",
    },
  ];

  const evidenceCoverage = buildEvidenceCoverage({
    identity,
    property: physical,
    auction,
    pricing,
    historical,
    comparables: compFields,
    market: marketFields,
    hasConflict: input.hasConflict,
  });

  return {
    property: stableSortByField(identity.concat(physical)),
    auction: stableSortByField(auction),
    pricing: stableSortByField(pricing),
    historical: {
      eventCount: input.ctx.observations.length,
      outcomes: input.ctx.scoredEvents?.map((e) => e.classification.outcome) ?? [],
      fields: stableSortByField(historical),
    },
    comparables: {
      acceptedCount: input.comparables.length,
      rejectedCount: input.rejectedCount,
      confidence: input.comparables[0]?.confidenceLabel ?? "Insufficient data",
      rejectionSummary: input.comparables.flatMap((c) => c.row.rejectionReasons).slice(0, 5),
    },
    market: {
      verifiedSales: input.verifiedSales,
      medianSalePrice:
        input.areaMedian != null
          ? input.areaMedian
          : "INSUFFICIENT_DATA",
      comparableMedian:
        input.comparableMedian != null
          ? input.comparableMedian
          : "INSUFFICIENT_DATA",
      status: evidenceCoverage.dimensions.find((d) => d.dimension === "market")?.level ?? "INSUFFICIENT_DATA",
    },
    evidenceCoverage,
    acquisitionGaps: input.acquisitionGaps,
    decisionStatus: input.decisionStatus,
    decisionReasons: input.decisionReasons,
  };
}

export function buildResearchEvidenceSummary(
  research: InvestorResearchSnapshot,
): ResearchEvidenceSummary {
  const whatWeKnow: string[] = [];
  const whatWeDoNotKnow: string[] = [];
  const whatNeedsVerification: string[] = [];

  for (const f of [...research.property, ...research.pricing, ...research.historical.fields]) {
    if (f.status === "VERIFIED" || f.status === "SOURCE_CONFIRMED" || f.status === "FACT") {
      if (f.value != null) whatWeKnow.push(`${f.field}: ${String(f.value)} (${f.status})`);
    } else if (f.status === "NOT_SUPPLIED" || f.status === "INSUFFICIENT_DATA") {
      whatWeDoNotKnow.push(`${f.field} not supplied`);
    } else if (f.status === "CONFLICT" || f.status === "REVIEW_REQUIRED") {
      whatNeedsVerification.push(`${f.field} requires review`);
    }
  }

  if (research.evidenceCoverage.overall === "CONFLICT") {
    whatNeedsVerification.push("Unresolved evidence conflicts on linked records");
  }

  return {
    coverage: research.evidenceCoverage,
    whatWeKnow: whatWeKnow.slice(0, 15),
    whatWeDoNotKnow: whatWeDoNotKnow.slice(0, 15),
    whatNeedsVerification,
    recommendedDataAcquisition: research.acquisitionGaps,
  };
}
