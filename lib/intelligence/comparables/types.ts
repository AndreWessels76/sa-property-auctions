/**
 * Historical Intelligence 2.5 — Comparable Sales & Market Evidence types.
 */

import type { HistoricalEventObservation, HistoricalEventState, NumericMetric } from "@/lib/intelligence/historical/types";

export type ComparableConfidenceLevel =
  | "High"
  | "Medium"
  | "Low"
  | "Insufficient data";

export type ComparableScoreBreakdown = {
  location_match: number;
  property_type_match: number;
  size_similarity: number;
  land_similarity: number;
  agricultural_similarity: number;
  bedroom_similarity: number;
  bathroom_similarity: number;
  sale_outcome_quality: number;
  data_completeness: number;
  evidence_bonus: number;
  total: number;
};

export type SaleEvidence = {
  salePrice: number | null;
  salePriceLabel: string;
  salePriceConflict: boolean;
  salePriceConflictNote: string | null;
  auctionPrice: number | null;
  guidePrice: number | null;
  reservePrice: number | null;
  estimatedValue: number | null;
  startingBid: number | null;
  verifiedSale: boolean;
  outcome: HistoricalEventState;
};

export type PricePerUnit = {
  value: number | null;
  label: string;
  calculable: boolean;
  reason: string | null;
  approximate: boolean;
};

export type ComparableProvenance = {
  property_master_id: string | null;
  auction_event_id: string | null;
  listing_property_id: string | null;
  source: string | null;
  source_url: string | null;
  source_snapshot_id: string | null;
  pricing_observation_id: string | null;
  extraction_run_id: string | null;
  calculated_at: string;
  calculation_version: string;
};

export type ComparableRow = {
  observationId: string;
  propertyMasterId: string | null;
  auctionEventId: string | null;
  listingPropertyId: string | null;
  title: string | null;
  town: string | null;
  suburb: string | null;
  propertyType: string | null;
  auctionDate: string | null;
  outcome: HistoricalEventState;
  saleEvidence: SaleEvidence;
  floorSizeM2: number | null;
  landSizeM2: number | null;
  hectares: number | null;
  hectaresApproximate: boolean;
  pricePerM2: PricePerUnit;
  pricePerHa: PricePerUnit;
  distanceKm: number | null;
  comparableConfidence: ComparableConfidenceLevel;
  score: ComparableScoreBreakdown;
  matchingEvidence: string[];
  conflictingEvidence: string[];
  rejected: boolean;
  rejectionReasons: string[];
  provenance: ComparableProvenance;
};

export type ComparableTableColumn =
  | "property"
  | "town_suburb"
  | "property_type"
  | "auction_date"
  | "outcome"
  | "sale_price"
  | "floor_size"
  | "land_size"
  | "hectares"
  | "price_per_m2"
  | "price_per_ha"
  | "distance"
  | "confidence"
  | "evidence";

export type ComparableSearchResult = {
  version: string;
  subjectPropertyId: string;
  subjectMasterId: string | null;
  subjectObservation: HistoricalEventObservation | null;
  bestComparable: ComparableRow | null;
  comparables: ComparableRow[];
  rejectedCandidates: Array<{ observationId: string; reasons: string[] }>;
  tableColumns: ComparableTableColumn[];
  limitations: string[];
  sampleSize: number;
  confidence: ComparableConfidenceLevel;
  premium: boolean;
  cacheKey: string;
};

export type MarketEvidenceResult = {
  version: string;
  scope: "area" | "agency" | "market";
  scopeLabel: string;
  activity: {
    historicalAuctions: number;
    verifiedSales: number;
    withdrawn: number;
    cancelled: number;
    expired: number;
    upcoming: number;
    live: number;
  };
  salePrice: NumericMetric;
  medianSalePrice: NumericMetric;
  averageSalePrice: NumericMetric;
  minSalePrice: NumericMetric;
  maxSalePrice: NumericMetric;
  averagePricePerM2: NumericMetric;
  medianPricePerM2: NumericMetric;
  averagePricePerHa: NumericMetric;
  medianPricePerHa: NumericMetric;
  growth: {
    calculable: boolean;
    narrative: string;
  };
  sampleSize: number;
  limitations: string[];
  premium: boolean;
};

export type MasterHistoryEvent = {
  year: number;
  auctionDate: string | null;
  state: HistoricalEventState;
  salePrice: number | null;
  auctionEventId: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  provenance: ComparableProvenance;
};

export type PropertyTimelineStage = {
  stage:
    | "listed"
    | "auction_scheduled"
    | "auction_occurred"
    | "sold"
    | "withdrawn"
    | "cancelled"
    | "expired"
    | "relisted";
  date: string | null;
  evidence: string;
  supported: boolean;
};

export type PropertyMarketEvidenceSummary = {
  historicalAuctions: number;
  verifiedSales: number;
  bestComparableConfidence: ComparableConfidenceLevel;
  hasSalePriceEvidence: boolean;
  pricePerM2: PricePerUnit;
  pricePerHa: PricePerUnit;
  limitations: string[];
};
