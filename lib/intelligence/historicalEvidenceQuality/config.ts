/**
 * Historical Evidence Quality & Review 4.4 — configuration.
 */

export const HISTORICAL_EVIDENCE_QUALITY44_VERSION =
  "historical-evidence-quality-4.4.0";

/** Source hierarchy tiers (1 = strongest). */
export const HEQ44_SOURCE_TIERS = [
  "LICENSED_OFFICIAL_PARTNER_PAGE",
  "LICENSED_AUCTION_CATALOGUE",
  "LICENSED_PARTNER_RESULT_PAGE",
  "PLATFORM_SNAPSHOT",
  "SECONDARY_SOURCE",
] as const;

export type Heq44SourceTier = (typeof HEQ44_SOURCE_TIERS)[number];

export const HEQ44_DEFAULT_BATCH_LIMIT = 5;
