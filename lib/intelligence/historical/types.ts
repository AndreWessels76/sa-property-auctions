/**
 * Historical Intelligence 2B — shared types.
 * Analytics version: historical-intelligence-2.0.0
 * Never fabricates. Auction Events are the historical unit.
 */

export const HISTORICAL_INTELLIGENCE_VERSION = "historical-intelligence-2.0.0";

export type HistoricalEventState =
  | "upcoming"
  | "live"
  | "completed"
  | "sold"
  | "withdrawn"
  | "cancelled"
  | "expired"
  | "unknown";

export type HistoricalPriceKind =
  | "sale_price"
  | "auction_price"
  | "guide_price"
  | "reserve_price"
  | "estimated_value"
  | "starting_bid";

export type HistoricalMarketCategory =
  | "Residential"
  | "Commercial"
  | "Industrial"
  | "Agricultural"
  | "Vacant Land"
  | "Needs verification";

export type ExclusionReason =
  | "MISSING_PRICE"
  | "MISSING_DATE"
  | "UNVERIFIED"
  | "DUPLICATE_EVENT"
  | "INVALID_PRICE"
  | "INVALID_SIZE"
  | "UNKNOWN_PROPERTY_TYPE"
  | "CONFLICT"
  | "INSUFFICIENT_IDENTITY"
  | "NOT_HISTORICAL"
  | "RANGE_NOT_EXACT"
  | "UNSUPPORTED_CURRENCY";

export type TimeWindow =
  | "30d"
  | "90d"
  | "6m"
  | "12m"
  | "24m"
  | "36m"
  | "all";

export type SampleSafety =
  | "insufficient_data"
  | "limited_one"
  | "limited_sample"
  | "statistic";

export type HistoricalPriceFields = {
  sale_price: number | null;
  auction_price: number | null;
  guide_price: number | null;
  reserve_price: number | null;
  estimated_value: number | null;
  starting_bid: number | null;
};

export type HistoricalEventObservation = {
  observationId: string;
  sourceUnit: "auction_event" | "listing_fallback";
  auctionEventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
  state: HistoricalEventState;
  outcomeSupplied: boolean;
  auctionDate: string | null;
  dateKind: "auction_date" | "not_supplied";
  agency: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  verificationState: string | null;
  verified: boolean;
  conflict: boolean;
  propertyType: string | null;
  propertyTypeStatus: "known" | "needs_verification";
  marketCategory: HistoricalMarketCategory;
  agriculturalSubtype: string | null;
  province: string | null;
  municipality: string | null;
  town: string | null;
  suburb: string | null;
  farmName: string | null;
  floorSizeM2: number | null;
  hectares: number | null;
  hectaresApproximate: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  prices: HistoricalPriceFields;
  exclusionReasons: ExclusionReason[];
};

export type NumericMetric = {
  definition: string;
  priceKind: HistoricalPriceKind | null;
  count: number;
  eligibleCount: number;
  coverageNumerator: number;
  coverageDenominator: number;
  coverageLabel: string;
  average: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  sampleSafety: SampleSafety;
  sampleSafetyLabel: string;
  isApproximate: boolean;
  period: TimeWindow;
  notCalculableReason: string | null;
};

export type CountMetric = {
  label: string;
  count: number;
  denominator: number | null;
  definition: string;
};

export type TrendPoint = {
  periodKey: string;
  periodLabel: string;
  count: number;
  median: number | null;
  average: number | null;
  sampleSafety: SampleSafety;
};

export type GrowthResult = {
  fromPeriod: string;
  toPeriod: string;
  fromMedian: number | null;
  toMedian: number | null;
  percentage: number | null;
  narrative: string;
  calculable: boolean;
};

export type ExclusionRecord = {
  observationId: string;
  reasons: ExclusionReason[];
  state: HistoricalEventState;
  auctionEventId: string | null;
  listingPropertyId: string | null;
};

export type ComparableCandidate = {
  observationId: string;
  auctionEventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
  eligible: boolean;
  reasons: string[];
  propertyType: string | null;
  town: string | null;
  suburb: string | null;
  floorSizeM2: number | null;
  hectares: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  auctionDate: string | null;
  priceKind: HistoricalPriceKind | null;
  price: number | null;
};
