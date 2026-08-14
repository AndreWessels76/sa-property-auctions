import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { HistoricalEvidenceScore } from "@/lib/intelligence/historicalEvidence/types";
import type { HistoricalEventResolution } from "@/lib/intelligence/historicalResolution/types";
import type { Heq44SourceTier } from "./config";

export type EvidenceQualityOverall =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INSUFFICIENT_DATA"
  | "REVIEW_REQUIRED"
  | "CONFLICT";

export type FieldEvidenceStatus =
  | "VERIFIED"
  | "SOURCE_CONFIRMED"
  | "EXTRACTED"
  | "NOT_SUPPLIED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "REVIEW_REQUIRED";

export type FieldEvidenceKey =
  | "identity"
  | "property_type"
  | "town"
  | "suburb"
  | "address"
  | "land_size"
  | "hectares"
  | "floor_size"
  | "auction_date"
  | "auction_outcome"
  | "sale_date"
  | "sale_price"
  | "auction_price"
  | "guide_price"
  | "reserve_price"
  | "starting_bid"
  | "agency"
  | "source";

export type FieldEvidenceRecord = {
  field: FieldEvidenceKey;
  value: string | number | null;
  status: FieldEvidenceStatus;
  source: string | null;
  snapshot: string | null;
  confidence: string | null;
  extractedAt: string | null;
};

export type SourceQualityRecord = {
  sourceTier: Heq44SourceTier | "UNKNOWN";
  sourceAuthority: string | null;
  sourceUrl: string | null;
  snapshotHash: string | null;
  retrievedAt: string | null;
};

export type SourceConsistencyState = "NO_CHANGE" | "CONSISTENT_UPDATE" | "CONFLICT";

export type EvidenceQualityAssessment = {
  observationId: string;
  auctionEventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
  overallQuality: EvidenceQualityOverall;
  score: number;
  reasons: string[];
  positiveEvidence: string[];
  missingEvidence: string[];
  conflicts: string[];
  sourceCount: number;
  snapshotCount: number;
  fields: FieldEvidenceRecord[];
  sourceQuality: SourceQualityRecord;
  sourceConsistency: SourceConsistencyState;
  evidenceChain: EvidenceChainLink[];
  comparableEligible: boolean;
  comparableRejectionCodes: string[];
  reviewPriority: 1 | 2 | 3 | 4 | null;
  reviewRequired: boolean;
};

export type EvidenceChainLink = {
  stage: string;
  id: string | null;
  label: string | null;
  href: string | null;
};

export type QualityReviewAction =
  | "approve_evidence"
  | "reject_evidence"
  | "mark_insufficient"
  | "resolve_conflict"
  | "request_reacquisition";

export type QualityDashboard = {
  totalHistoricalEvents: number;
  highQuality: number;
  mediumQuality: number;
  lowQuality: number;
  reviewRequired: number;
  conflicts: number;
  insufficientData: number;
  verifiedSold: number;
  verifiedSalePrices: number;
  confirmedOutcomes: number;
  sourceCoverage: number;
  snapshotCoverage: number;
  comparableReady: number;
  reviewQueue: {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    total: number;
  };
};

export type QualityReviewPayload = {
  event: HistoricalEventObservation;
  classification: OutcomeClassification;
  score: HistoricalEvidenceScore;
  resolution: HistoricalEventResolution;
  quality: EvidenceQualityAssessment;
  openReviews: Array<{ id: string; category: string; status: string; evidence_text: string | null }>;
  openConflicts: Array<{ id: string; claim_a: string; claim_b: string; status: string }>;
};
