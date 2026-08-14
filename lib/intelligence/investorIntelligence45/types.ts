import type { ComparableRow } from "@/lib/intelligence/comparables/types";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";

export type InvestorDecisionStatus =
  | "STRONG_EVIDENCE"
  | "GOOD_EVIDENCE"
  | "LIMITED_EVIDENCE"
  | "INSUFFICIENT_DATA"
  | "REVIEW_REQUIRED"
  | "CONFLICT";

export type PriceEvidenceField = {
  value: number | null;
  type: string;
  source: string | null;
  evidenceStatus: string;
  date: string | null;
  confidence: string | null;
  label: string;
};

export type MarketEvidenceSummary = {
  historicalEventCount: number;
  confirmedSold: number;
  confirmedPassedIn: number;
  confirmedWithdrawn: number;
  confirmedCancelled: number;
  unknownOutcomes: number;
  verifiedSalePriceCount: number;
  verifiedAuctionPriceCount: number;
  verifiedSizeEvidenceCount: number;
  comparableReadyCount: number;
  evidenceQuality: { high: number; medium: number; low: number; insufficient: number };
  sourceQuality: Record<string, number>;
  lastEnrichmentDate: string | null;
  lastEvidenceUpdate: string | null;
  conflictCount: number;
  provenance: { version: string; calculatedAt: string };
};

export type MarketPosition = {
  status: "AVAILABLE" | "INSUFFICIENT_DATA";
  verifiedSalePrice: number | null;
  pricePerM2: { value: number | null; calculable: boolean; reason: string | null };
  pricePerHa: { value: number | null; calculable: boolean; reason: string | null; approximate: boolean };
  comparableMedian: number | null;
  comparableRange: { min: number | null; max: number | null };
  areaMedian: number | null;
  requiredSample: number;
  actualSample: number;
  missingCategories: string[];
  recommendedAction: string | null;
};

export type ComparablePresentation = {
  row: ComparableRow;
  explanation: string[];
  confidenceLabel: string;
};

export type InvestorSnapshot = {
  property: Record<string, string | number | null>;
  priceEvidence: PriceEvidenceField[];
  historicalEvidence: {
    previousEvents: number;
    outcomes: string[];
    verifiedPrices: number;
    evidenceQuality: string | null;
  };
  comparableEvidence: {
    acceptedCount: number;
    confidence: string;
    median: number | null;
    range: { min: number | null; max: number | null };
    topExplanations: string[];
  };
  marketEvidence: {
    areaSampleSize: number;
    verifiedSales: number;
    median: number | null;
    pricePerM2: number | null;
    pricePerHa: number | null;
    trend: string;
  };
  evidenceWarnings: string[];
};

export type InvestorQuestionAnswer = {
  question: string;
  answer: string;
  detail: string[];
};

export type AcquisitionGap = {
  town: string | null;
  agency: string | null;
  verifiedSales: number;
  required: number;
  gap: number;
  recommendedAction: string;
  priority: string;
};

export type InvestorIntelligenceResult = {
  version: string;
  cacheKey: string;
  calculatedAt: string;
  propertyId: string;
  premium: boolean;
  decisionStatus: InvestorDecisionStatus;
  decisionReasons: string[];
  marketEvidenceSummary: MarketEvidenceSummary;
  marketPosition: MarketPosition;
  snapshot: InvestorSnapshot;
  questions: InvestorQuestionAnswer[];
  comparables: ComparablePresentation[];
  evidenceChain: Array<{ stage: string; label: string }>;
  conflicts: string[];
};

export type AreaIntelligence45 = {
  town: string;
  historicalVolume: number;
  confirmedSales: number;
  confirmedUnsold: number;
  withdrawn: number;
  cancelled: number;
  unknown: number;
  verifiedSalePriceCoverage: number;
  comparableCoverage: number;
  evidenceQuality: Record<string, number>;
  marketStatisticsAvailable: boolean;
  insufficientReason: string | null;
  provenance: { version: string; calculatedAt: string };
};

export type AgencyIntelligence45 = AreaIntelligence45 & { agency: string };

export type TimeSeriesBucket = {
  period: string;
  auctionCount: number;
  verifiedSoldCount: number;
  verifiedSalePriceCount: number;
  medianSalePrice: number | null;
  medianPricePerM2: number | null;
  medianPricePerHa: number | null;
  evidenceCoverage: number;
  trendStatus: "TREND_AVAILABLE" | "TREND_INSUFFICIENT_DATA";
};

export type InvestorDashboard45 = {
  historicalEvents: number;
  verifiedSales: number;
  verifiedSalePrices: number;
  comparableReadyEvents: number;
  marketReadyTowns: number;
  marketReadyAgencies: number;
  evidenceQualityHigh: number;
  openConflicts: number;
  reviewRequired: number;
  insufficientData: number;
};

export type BuildContext = {
  observations: HistoricalEventObservation[];
  scoredEvents?: Array<{
    observation: HistoricalEventObservation;
    classification: import("@/lib/intelligence/outcomes/types").OutcomeClassification;
    score: import("@/lib/intelligence/historicalEvidence/types").HistoricalEvidenceScore;
  }>;
  town?: string | null;
  agency?: string | null;
};
