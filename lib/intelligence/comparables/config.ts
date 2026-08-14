/**
 * Historical Intelligence 2.5 — comparable & market evidence configuration.
 */

export const COMPARABLE_INTELLIGENCE_VERSION = "historical-intelligence-4.0.0";

export type ComparableIntelligenceConfig = {
  minimumComparableSales: number;
  minimumMarketSales: number;
  /** Free tier max comparables returned */
  freeComparableLimit: number;
  /** Premium tier max comparables returned */
  premiumComparableLimit: number;
  /** Floor size similarity tolerance (±%) */
  floorSizeTolerancePct: number;
  /** Hectare similarity tolerance (±%) */
  hectareTolerancePct: number;
  /** Max geographic distance km when coordinates exist */
  maxDistanceKm: number;
};

export const DEFAULT_COMPARABLE_CONFIG: ComparableIntelligenceConfig = {
  minimumComparableSales: 3,
  minimumMarketSales: 5,
  freeComparableLimit: 2,
  premiumComparableLimit: 12,
  floorSizeTolerancePct: 25,
  hectareTolerancePct: 30,
  maxDistanceKm: 50,
};
