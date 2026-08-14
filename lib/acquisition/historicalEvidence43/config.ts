/**
 * Historical Evidence Acquisition 4.3 — configuration.
 */

export const HISTORICAL_EVIDENCE_ACQUISITION43_VERSION =
  "historical-evidence-acquisition-4.3.0";

export const HEA43_DEFAULT_BATCH_LIMIT = 5;
export const HEA43_MAX_BATCH_LIMIT = 30;

/** Source hierarchy rank (higher = stronger). */
export const HEA43_SOURCE_HIERARCHY = [
  "LICENSED_PARTNER_API",
  "LICENSED_PARTNER_DOCUMENT",
  "OFFICIAL_AUCTION_RESULT_PAGE",
  "LICENSED_AGENCY_ARCHIVE",
  "APPROVED_HISTORICAL_CATALOGUE",
  "APPROVED_SECONDARY_SOURCE",
] as const;

export type Hea43SourceTier = (typeof HEA43_SOURCE_HIERARCHY)[number];
