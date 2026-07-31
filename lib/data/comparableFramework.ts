/**
 * Comparable sales framework types (no AI valuation).
 * Runtime matching remains in lib/maps/getComparableSales.ts.
 */
export type ComparableRecordStatus =
  | "available"
  | "pending"
  | "unavailable";

export type ComparableSaleRecord = {
  comparablePropertyId: string;
  subjectPropertyId: string;
  saleDate: string | null;
  salePrice: number | null;
  distanceKm: number | null;
  similarityScore: number | null;
  source: string | null;
  status: ComparableRecordStatus;
};

export const COMPARABLE_PLACEHOLDER =
  "No comparable auction sales are currently available for this property. Comparable sales will automatically appear as more auction history becomes available.";
