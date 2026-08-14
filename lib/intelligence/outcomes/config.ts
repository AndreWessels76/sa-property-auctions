/**
 * Historical Intelligence 3.0 — outcome & market performance configuration.
 */

export const OUTCOME_INTELLIGENCE_VERSION = "historical-intelligence-3.1.0";

export type OutcomeIntelligenceConfig = {
  minimumMarketSales: number;
  minimumComparableSales: number;
  minimumTimeSeriesSales: number;
};

export const DEFAULT_OUTCOME_CONFIG: OutcomeIntelligenceConfig = {
  minimumMarketSales: 5,
  minimumComparableSales: 3,
  minimumTimeSeriesSales: 3,
};

/** Documented comparable weight caps (deterministic, not ML). */
export const COMPARABLE_WEIGHTS = {
  suburb: 25,
  town: 15,
  propertyTypeExact: 20,
  propertyTypeCompatible: 10,
  floorSize: 15,
  landHectares: 12,
  bedrooms: 5,
  bathrooms: 5,
  agriculturalType: 10,
  distanceKm: 10,
  verifiedSale: 20,
} as const;
