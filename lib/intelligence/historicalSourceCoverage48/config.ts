/**
 * Historical Source Coverage & Acquisition Diagnostics 4.8
 * Observability layer — no parallel acquisition engine.
 */

export const HISTORICAL_SOURCE_COVERAGE48_VERSION =
  "historical-source-coverage-4.9.0";

/** @deprecated use HSA49_DEFAULT_BATCH_LIMIT */
export const HSC48_P1_BATCH_LIMIT = 5;

export const HSA49_VERSION = "historical-source-acquisition-4.9.0";
export const HSA49_DEFAULT_BATCH_LIMIT = 5;
export const HSA49_MAX_BATCH_LIMIT = 10;
export const HSA49_MAX_RETRY_ATTEMPTS = 3;
export const HSA49_RETRY_BASE_DELAY_MS = 2_000;
export const HSA49_RETRY_MAX_DELAY_MS = 60_000;
