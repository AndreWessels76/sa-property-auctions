/**
 * Investor Intelligence 4.6 — configuration.
 */

export const INVESTOR_INTELLIGENCE46_VERSION = "investor-intelligence-4.6.0";

export const II46_MINIMUM_MARKET_SALES = 5;
export const II46_MINIMUM_COMPARABLE_SALES = 3;

/** Re-export II 4.5 thresholds for consistency */
export { II45_MINIMUM_MARKET_SALES, II45_MINIMUM_COMPARABLE_SALES } from "@/lib/intelligence/investorIntelligence45/config";
