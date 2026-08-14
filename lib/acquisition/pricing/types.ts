/**
 * Shared pricing observation types — Pricing Data Acquisition 1.0
 */

export type PricingFieldName =
  | "auction_price"
  | "reserve_price"
  | "guide_price"
  | "estimated_value"
  | "sale_price"
  | "starting_bid"
  | "from_price"
  | "floor_size_m2"
  | "land_size_m2"
  | "total_hectares";

export type PricingObservationStatus =
  | "extracted"
  | "source_confirmed"
  | "verified"
  | "not_supplied"
  | "needs_verification"
  | "pending"
  | "conflict"
  | "anomaly"
  | "unsupported_currency"
  | "rejected"
  | "calculated";

export type PricingObservationDraft = {
  field_name: PricingFieldName;
  raw_value: string;
  normalized_value: number | null;
  currency: "ZAR" | null;
  is_approximate: boolean;
  is_range: boolean;
  min_value: number | null;
  max_value: number | null;
  status: PricingObservationStatus;
  evidence_text: string;
  source_name: string | null;
  source_url: string | null;
  parser_version: string;
  extraction_method: "deterministic_text" | "structured_field";
  conversion_method: string | null;
  notes: string | null;
};

export type PricingConflictRecord = {
  field_name: PricingFieldName;
  old_value: number | null;
  new_value: number | null;
  old_status: string | null;
  new_status: string | null;
  old_source: string | null;
  new_source: string | null;
  old_evidence: string | null;
  new_evidence: string | null;
  message: string;
};
