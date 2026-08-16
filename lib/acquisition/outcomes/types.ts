/**
 * Historical Intelligence 3.1 — outcome extraction types.
 */

export const OUTCOME_EXTRACTION_VERSION = "historical-data-acquisition-4.0.0";

export type OutcomeEvidenceKind =
  | "SOURCE_EXPLICIT"
  | "SOURCE_STATUS"
  | "SOURCE_RESULT"
  | "ADMIN_VERIFIED"
  | "PARTNER_CONFIRMED"
  | "DOCUMENT_EVIDENCE";

export type ExtractedOutcomeState =
  | "SOLD"
  | "WITHDRAWN"
  | "CANCELLED"
  | "POSTPONED"
  | "PASSED_IN"
  | "EXPIRED"
  | "COMPLETED_UNKNOWN"
  | "UNKNOWN";

export type OutcomeExtractionDraft = {
  outcome: ExtractedOutcomeState;
  confidence: "high" | "medium" | "low";
  evidence_type: OutcomeEvidenceKind;
  evidence_text: string;
  source_url: string | null;
  source_name: string | null;
  extraction_method:
    | "deterministic_text"
    | "structured_status"
    | "auction_event_status"
    | "partner_results_feed";
  sale_price: number | null;
  sale_price_evidence: string | null;
  sale_price_confidence: "high" | "medium" | "low" | "none";
  review_required: boolean;
  review_category: string | null;
  notes: string | null;
};

export type EnrichmentRunStatus =
  | "COMPLETED"
  | "NO_CHANGE"
  | "SOURCE_UNAVAILABLE"
  | "SKIPPED_LICENSE"
  | "REVIEW_REQUIRED"
  | "CONFLICT"
  | "FAILED"
  | "SKIPPED_NOT_HISTORICAL";

export type ReviewCategory =
  | "OUTCOME_REVIEW"
  | "SALE_PRICE_REVIEW"
  | "CONFLICT_REVIEW"
  | "IDENTITY_CONFLICT"
  | "SOURCE_UNAVAILABLE"
  | "LOW_CONFIDENCE";
