import type { InvestorIntelligenceResult } from "@/lib/intelligence/investorIntelligence45/types";

export type FieldEvidenceStatus =
  | "FACT"
  | "SOURCE_CONFIRMED"
  | "EXTRACTED"
  | "VERIFIED"
  | "INFERRED"
  | "CALCULATED"
  | "NOT_SUPPLIED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INSUFFICIENT_DATA"
  | "REVIEW_REQUIRED";

export type CoverageLevel = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA" | "CONFLICT";

export type FieldEvidence = {
  field: string;
  value: string | number | boolean | null;
  status: FieldEvidenceStatus;
  source: string | null;
  sourceUrl: string | null;
  observedAt: string | null;
  confidence: string | null;
  approximate?: boolean;
};

export type DimensionCoverage = {
  dimension:
    | "identity"
    | "property"
    | "auction"
    | "pricing"
    | "historical"
    | "comparables"
    | "market";
  level: CoverageLevel;
  score: number;
  maxScore: number;
  fieldsPresent: number;
  fieldsTotal: number;
  reasons: string[];
};

export type EvidenceCoverageScore = {
  overall: CoverageLevel;
  dimensions: DimensionCoverage[];
  provenance: { version: string };
};

export type AcquisitionGapCode =
  | "SALE_OUTCOME_MISSING"
  | "SALE_PRICE_MISSING"
  | "SIZE_MISSING"
  | "LOCATION_MISSING"
  | "IDENTITY_REVIEW_REQUIRED"
  | "SOURCE_MISSING"
  | "COMPARABLE_DATA_MISSING"
  | "MARKET_DATA_MISSING"
  | "PRICING_OBSERVATION_MISSING";

export type AcquisitionGap46 = {
  gapCode: AcquisitionGapCode;
  priority: "P1" | "P2" | "P3" | "P4";
  reason: string;
  requiredEvidence: string;
  recommendedExistingQueue: string;
  town?: string | null;
  agency?: string | null;
};

export type ResearchEvidenceSummary = {
  coverage: EvidenceCoverageScore;
  whatWeKnow: string[];
  whatWeDoNotKnow: string[];
  whatNeedsVerification: string[];
  recommendedDataAcquisition: AcquisitionGap46[];
};

export type InvestorResearchSnapshot = {
  property: FieldEvidence[];
  auction: FieldEvidence[];
  pricing: FieldEvidence[];
  historical: {
    eventCount: number;
    outcomes: string[];
    fields: FieldEvidence[];
  };
  comparables: {
    acceptedCount: number;
    rejectedCount: number;
    confidence: string;
    rejectionSummary: string[];
  };
  market: {
    verifiedSales: number;
    medianSalePrice: number | null | "INSUFFICIENT_DATA";
    comparableMedian: number | null | "INSUFFICIENT_DATA";
    status: CoverageLevel;
  };
  evidenceCoverage: EvidenceCoverageScore;
  acquisitionGaps: AcquisitionGap46[];
  decisionStatus: string;
  decisionReasons: string[];
};

export type AreaIntelligence46 = {
  town: string;
  historicalEventCount: number;
  confirmedOutcomes: number;
  verifiedSales: number;
  evidenceCoverage: CoverageLevel;
  comparableCoverage: number;
  acquisitionGaps: AcquisitionGap46[];
  marketStatisticsAvailable: boolean;
  dataFreshness: string | null;
  sourceCoverage: number;
  status: CoverageLevel;
  provenance: { version: string };
};

export type AgencyIntelligence46 = AreaIntelligence46 & {
  agency: string;
  listingActivity: number;
};

export type InvestorDashboard46 = {
  propertiesAnalysed: number;
  highEvidence: number;
  mediumEvidence: number;
  lowEvidence: number;
  insufficientData: number;
  conflicts: number;
  acquisitionGaps: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
};

export type InvestorIntelligence46Result = InvestorIntelligenceResult & {
  version46: string;
  cacheKey46: string;
  research: InvestorResearchSnapshot;
  evidenceSummary: ResearchEvidenceSummary;
  acquisitionGaps46: AcquisitionGap46[];
  freeTierLimited: boolean;
  /** II 4.7 — PROVEN / TESTED / MISSING / REVIEW REQUIRED labels for research UI */
  investorLabels?: import("@/lib/intelligence/investorIntelligence47").LabeledResearchField[];
};
