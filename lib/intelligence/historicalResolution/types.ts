import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { HistoricalEvidenceScore } from "@/lib/intelligence/historicalEvidence/types";
import type { EvidenceConfidenceLevel } from "@/lib/intelligence/historicalEvidence/config";
import type { OutcomeExtractionDraft } from "@/lib/acquisition/outcomes/types";

export type ResolutionState =
  | "UNRESOLVED"
  | "SOURCE_FOUND"
  | "EXTRACTED"
  | "IDENTITY_PENDING"
  | "REVIEW_REQUIRED"
  | "VERIFIED"
  | "CONFLICT"
  | "INSUFFICIENT_DATA";

export type ResolutionLabel =
  | "VERIFIED_SOLD"
  | "SOLD_WITHOUT_PRICE"
  | "VERIFIED_OUTCOME"
  | "NOT_SUPPLIED"
  | "INSUFFICIENT_DATA"
  | null;

export type ComparableRejectionReason =
  | "OUTCOME_NOT_SOLD"
  | "SALE_PRICE_MISSING"
  | "IDENTITY_UNCERTAIN"
  | "LOCATION_MISMATCH"
  | "SIZE_MISMATCH"
  | "SAME_PROPERTY_MASTER"
  | "CONFLICTING_EVIDENCE"
  | "INSUFFICIENT_DATA"
  | "UNVERIFIED_LISTING"
  | "UNKNOWN_PROPERTY_TYPE"
  | "INCOMPATIBLE_PROPERTY_TYPE";

export type SourceEvidenceTier =
  | "OFFICIAL_AUCTIONEER_RESULT"
  | "OFFICIAL_HISTORICAL_PAGE"
  | "OFFICIAL_CATALOGUE_DOCUMENT"
  | "LICENSED_PARTNER"
  | "LICENSED_RESULT_FEED"
  | "VERIFIED_SNAPSHOT"
  | "PERMITTED_EVIDENCE"
  | "UNKNOWN";

export type OutcomePriceAgreement =
  | "VERIFIED"
  | "SOLD_WITHOUT_PRICE"
  | "REVIEW_REQUIRED"
  | "CONFLICT"
  | "INSUFFICIENT";

export type HistoricalEventResolution = {
  observationId: string;
  auctionEventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
  state: ResolutionState;
  label: ResolutionLabel;
  outcome: OutcomeClassification["outcome"];
  salePrice: number | null;
  salePriceSupplied: boolean;
  agreement: OutcomePriceAgreement;
  evidenceQuality: EvidenceConfidenceLevel;
  sourceTier: SourceEvidenceTier;
  comparableEligible: boolean;
  comparableRejectionReasons: ComparableRejectionReason[];
  marketStatisticsEligible: boolean;
  identityReviewRequired: boolean;
  recommendedAction: string | null;
  provenance: {
    sourceUrl: string | null;
    sourceName: string | null;
    snapshotId: string | null;
    sourceHash: string | null;
    evidenceText: string | null;
    parserVersion: string | null;
    fetchedAt: string | null;
    extractedAt: string | null;
  };
  conflicts: string[];
  acquisitionGaps: string[];
};

export type ResolutionDashboard = {
  totalHistoricalEvents: number;
  unresolved: number;
  sourceFound: number;
  extracted: number;
  identityPending: number;
  reviewRequired: number;
  verified: number;
  verifiedSold: number;
  soldWithoutPrice: number;
  verifiedSalePrices: number;
  conflicts: number;
  identityReviews: number;
  insufficientData: number;
  comparableReady: number;
  marketStatisticsAvailable: boolean;
  evidenceConfidence: {
    high: number;
    medium: number;
    low: number;
    insufficient: number;
  };
};

export type ResolutionReviewPayload = {
  event: HistoricalEventObservation;
  classification: OutcomeClassification;
  score: HistoricalEvidenceScore;
  resolution: HistoricalEventResolution;
  draft: OutcomeExtractionDraft | null;
  openReviews: Array<{ id: string; category: string; status: string; evidence_text: string | null }>;
  openConflicts: Array<{ id: string; claim_a: string; claim_b: string; status: string }>;
};

export type AdminResolutionAction =
  | "confirm_sold"
  | "confirm_not_sold"
  | "confirm_sale_price"
  | "reject_evidence"
  | "resolve_one"
  | "resolve_batch"
  | "rerun_extraction";
