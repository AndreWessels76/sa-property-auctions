import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { EvidenceConfidenceLevel } from "./config";

export type EvidenceDimensionScore = {
  level: EvidenceConfidenceLevel;
  reason: string;
};

export type HistoricalEvidenceScore = {
  observationId: string;
  auctionEventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
  outcomeEvidence: EvidenceDimensionScore;
  salePriceEvidence: EvidenceDimensionScore;
  sourceEvidence: EvidenceDimensionScore;
  dateEvidence: EvidenceDimensionScore;
  identityConfidence: EvidenceDimensionScore;
  locationConfidence: EvidenceDimensionScore;
  pricingConfidence: EvidenceDimensionScore;
  documentationConfidence: EvidenceDimensionScore;
  overallConfidence: EvidenceConfidenceLevel;
  overallReason: string;
  comparableReady: boolean;
  marketStatisticsReady: boolean;
  acquisitionGaps: string[];
};

export type HistoricalCoverageDashboard = {
  totalHistoricalEvents: number;
  confirmedOutcomes: number;
  unknownOutcomes: number;
  verifiedSalePrices: number;
  eventsWithPricingEvidence: number;
  eventsWithSourceEvidence: number;
  eventsWithLocationEvidence: number;
  eventsWithSizeEvidence: number;
  comparableReadyEvents: number;
  marketStatisticsReadyEvents: number;
  insufficientDataCases: number;
  averageOverallConfidence: EvidenceConfidenceLevel;
};

export type PropertyHistoricalPerformance = {
  propertyId: string;
  propertyMasterId: string | null;
  recordedAuctionEvents: number;
  historicalOutcomes: Array<{
    auctionDate: string | null;
    outcome: string;
    salePrice: number | null;
    evidenceConfidence: EvidenceConfidenceLevel;
    sourceUrl: string | null;
  }>;
  verifiedSalePrices: number;
  pricePerM2: { calculable: boolean; value: number | null; reason: string | null };
  pricePerHa: { calculable: boolean; value: number | null; approximate: boolean; reason: string | null };
  comparableCount: number;
  comparableConfidence: string;
  historicalEvidenceConfidence: EvidenceConfidenceLevel;
  limitations: string[];
};

export type ScoredEvent = {
  observation: HistoricalEventObservation;
  classification: OutcomeClassification;
  score: HistoricalEvidenceScore;
};
