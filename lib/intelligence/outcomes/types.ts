/**
 * Historical Intelligence 3.0 — Auction Outcome & Market Performance types.
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { NumericMetric } from "@/lib/intelligence/historical/types";

export type AuctionOutcomeState =
  | "SOLD"
  | "WITHDRAWN"
  | "CANCELLED"
  | "EXPIRED"
  | "UNSOLD"
  | "POSTPONED"
  | "UNKNOWN";

export type OutcomeEvidenceType =
  | "source_text"
  | "auction_result_page"
  | "source_status"
  | "structured_partner"
  | "result_document"
  | "source_snapshot"
  | "auction_event_status";

export type OutcomeEvidence = {
  outcome: AuctionOutcomeState;
  confidence: "high" | "medium" | "low";
  evidenceTypes: OutcomeEvidenceType[];
  sourceUrl: string | null;
  sourceSnapshotId: string | null;
  sourceTimestamp: string | null;
  evidenceText: string | null;
  extractionMethod: string | null;
  auctionEventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
};

export type SalePriceEvidence = {
  salePrice: number | null;
  salePriceSource: string | null;
  salePriceObservedAt: string | null;
  salePriceEvidence: string | null;
  salePriceConfidence: "high" | "medium" | "low" | "none";
  conflict: boolean;
  conflictNote: string | null;
};

export type OutcomeClassification = {
  observationId: string;
  historicalState: HistoricalEventObservation["state"];
  outcome: AuctionOutcomeState;
  confirmed: boolean;
  outcomeEvidence: OutcomeEvidence;
  salePrice: SalePriceEvidence;
};

export type AuctionPerformanceMetrics = {
  totalAuctions: number;
  sold: number;
  unsold: number;
  withdrawn: number;
  cancelled: number;
  expired: number;
  postponed: number;
  unknown: number;
  confirmedOutcomes: number;
  saleRate: {
    value: number | null;
    numerator: number;
    denominator: number;
    label: string;
    calculable: boolean;
  };
  withdrawnRate: {
    value: number | null;
    numerator: number;
    denominator: number;
    label: string;
    calculable: boolean;
  };
  cancelledRate: {
    value: number | null;
    numerator: number;
    denominator: number;
    label: string;
    calculable: boolean;
  };
  unknownOutcomeRate: {
    value: number | null;
    numerator: number;
    denominator: number;
    label: string;
    calculable: boolean;
  };
  outcomeCoverage: {
    numerator: number;
    denominator: number;
    label: string;
    percentage: number | null;
  };
};

export type DataCoverageMetrics = {
  historicalEvents: number;
  outcomeCoverage: { numerator: number; denominator: number; label: string };
  salePriceCoverage: {
    numerator: number;
    denominator: number;
    label: string;
  };
  locationCoverage: { numerator: number; denominator: number; label: string };
  evidenceCoverage: { numerator: number; denominator: number; label: string };
  priceCoverage: { numerator: number; denominator: number; label: string };
};

export type TimeSeriesPoint = {
  periodKey: string;
  periodLabel: string;
  auctionVolume: number;
  confirmedSales: number;
  saleRate: number | null;
  medianSalePrice: number | null;
  medianPricePerM2: number | null;
  medianPricePerHa: number | null;
  sampleSafety: string;
  calculable: boolean;
};

export type MasterPriceChange = {
  propertyMasterId: string;
  previousSalePrice: number | null;
  latestSalePrice: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  timeBetweenSalesDays: number | null;
  calculable: boolean;
  narrative: string;
};

export type OutcomeConflict = {
  id: string;
  propertyMasterId: string | null;
  auctionEventId: string | null;
  claimA: string;
  claimB: string;
  evidenceA: string | null;
  evidenceB: string | null;
  status: string;
};

export type MarketPerformanceReport = {
  version: string;
  scope: string;
  periodLabel: string;
  dateRange: { from: string | null; to: string | null };
  performance: AuctionPerformanceMetrics;
  coverage: DataCoverageMetrics;
  salePrice: NumericMetric;
  medianSalePrice: NumericMetric;
  medianPricePerM2: NumericMetric;
  medianPricePerHa: NumericMetric;
  propertyTypeDistribution: Array<{ type: string; count: number }>;
  monthlyActivity: TimeSeriesPoint[];
  limitations: string[];
  premium: boolean;
};

export type PropertyHistoryChain = {
  propertyMasterId: string;
  events: Array<{
    year: number;
    auctionDate: string | null;
    outcome: AuctionOutcomeState;
    salePrice: number | null;
    auctionEventId: string | null;
    sourceUrl: string | null;
    outcomeEvidence: OutcomeEvidence;
  }>;
};
