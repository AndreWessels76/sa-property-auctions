/**
 * Due Diligence Evidence Engine — shared types.
 * Never fabricate. Every value must retain provenance.
 */

export const EXTRACTION_VERSION = "1.0.0";

export type ExtractionVerificationState =
  | "verified"
  | "source_confirmed"
  | "extracted_not_yet_verified"
  | "not_supplied_by_source"
  | "not_found"
  | "pending_verification"
  | "restricted"
  | "expired";

export type ExtractionMethod =
  | "deterministic_text"
  | "structured_field"
  | "document_link"
  | "geocoder";

export type FieldEvidence = {
  field: string;
  value: string | number | boolean | null;
  original_text: string | null;
  source: string | null;
  source_url: string | null;
  extraction_method: ExtractionMethod;
  extracted_at: string;
  verification_state: ExtractionVerificationState;
  approximate?: boolean;
  normalized?: Record<string, string | number | boolean | null>;
  conflict_with?: string | null;
};

export type SourcePriority =
  | "official_partner_feed"
  | "official_auction_page"
  | "official_auction_document"
  | "property_information_pack"
  | "trusted_geocoder"
  | "other_approved";

export const SOURCE_PRIORITY_RANK: Record<SourcePriority, number> = {
  official_partner_feed: 100,
  official_auction_page: 80,
  official_auction_document: 70,
  property_information_pack: 60,
  trusted_geocoder: 40,
  other_approved: 20,
};

export type DocumentDiscovery = {
  url: string;
  document_type: string;
  source: string | null;
  discovered_at: string;
  availability: "available" | "not_found" | "restricted";
  file_type: string | null;
  verification_state: ExtractionVerificationState;
};

export type FieldConflict = {
  field: string;
  values: Array<{
    value: string | number | boolean | null;
    source: string | null;
    original_text: string | null;
    priority: SourcePriority;
  }>;
  message: string;
};

export type LandMeasurement = {
  original_text: string;
  hectares: number | null;
  square_metres: number | null;
  acres: number | null;
  approximate: boolean;
  unit_detected: "ha" | "m2" | "acres" | null;
};

export type ExtractionCorpus = {
  title?: string | null;
  description?: string | null;
  features?: string | null;
  viewing_information?: string | null;
  deposit_requirements?: string | null;
  property_type?: string | null;
  province?: string | null;
  town?: string | null;
  suburb?: string | null;
  address?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garages?: number | null;
  erf_size?: number | null;
  floor_size?: number | null;
  auction_date?: string | null;
  auction_time?: string | null;
  auction_venue?: string | null;
  terms_link?: string | null;
  brochure_link?: string | null;
  catalogue_link?: string | null;
  registration_link?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  verification_state?: string | null;
  agricultural_details?: Record<string, unknown> | null;
  /** Optional extra plain text from scraped/official page (never invent). */
  source_page_text?: string | null;
};

export type ExtractionResult = {
  extraction_version: string;
  extracted_at: string;
  source_hash: string;
  fields: FieldEvidence[];
  documents: DocumentDiscovery[];
  conflicts: FieldConflict[];
  land: LandMeasurement | null;
  completeness: CompletenessScore;
  stats: {
    fields_found: number;
    fields_from_text: number;
    fields_from_structured: number;
    documents_found: number;
    conflicts: number;
    missing_key_fields: string[];
  };
};

export type CompletenessScore = {
  property: number;
  auction: number;
  location: number;
  land: number;
  documents: number;
  legal: number;
  building: number;
  utilities: number;
  overall: number;
};

export type DiligenceDisplayStatus =
  | "verified"
  | "source_confirmed"
  | "extracted"
  | "not_supplied"
  | "not_found"
  | "pending_verification"
  | "restricted"
  | "expired";

export function toDisplayStatus(
  state: ExtractionVerificationState,
): DiligenceDisplayStatus {
  switch (state) {
    case "verified":
      return "verified";
    case "source_confirmed":
      return "source_confirmed";
    case "extracted_not_yet_verified":
      return "extracted";
    case "not_supplied_by_source":
      return "not_supplied";
    case "not_found":
      return "not_found";
    case "pending_verification":
      return "pending_verification";
    case "restricted":
      return "restricted";
    case "expired":
      return "expired";
  }
}

export function displayStatusLabel(status: DiligenceDisplayStatus): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "source_confirmed":
      return "Source Confirmed";
    case "extracted":
      return "Found in source — pending verification";
    case "not_supplied":
      return "Not supplied by auction source";
    case "not_found":
      return "Not found in available source material";
    case "pending_verification":
      return "Verification required";
    case "restricted":
      return "Restricted";
    case "expired":
      return "Expired";
  }
}

export function isPresentStatus(status: DiligenceDisplayStatus): boolean {
  return (
    status === "verified" ||
    status === "source_confirmed" ||
    status === "extracted"
  );
}
