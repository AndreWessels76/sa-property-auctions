/**
 * Valid numeric gate for pricing math.
 * Rejects null, NaN, Infinity, zero, and negatives.
 */
export function isValidPositiveAmount(
  value: number | null | undefined,
): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

export function isValidPositiveArea(
  value: number | null | undefined,
): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

export type AbsoluteDifference = {
  absolute: number;
  percentage: number;
  direction: "below" | "above" | "equal";
};

/**
 * subject − reference.
 * Negative absolute ⇒ subject is below reference.
 */
export function calculateDifference(
  subject: number,
  reference: number,
): AbsoluteDifference | null {
  if (!isValidPositiveAmount(subject) || !isValidPositiveAmount(reference)) {
    return null;
  }
  const absolute = subject - reference;
  const percentage = (absolute / reference) * 100;
  const direction =
    absolute < 0 ? "below" : absolute > 0 ? "above" : "equal";
  return { absolute, percentage, direction };
}

export function calculatePricePerUnit(
  price: number,
  area: number,
): number | null {
  if (!isValidPositiveAmount(price) || !isValidPositiveArea(area)) {
    return null;
  }
  return price / area;
}

export function calculateHistoricalChange(
  earlier: number,
  later: number,
): AbsoluteDifference | null {
  return calculateDifference(later, earlier);
}

/** Round currency-like amounts to whole rand for display math. */
export function roundCurrency(value: number): number {
  return Math.round(value);
}

/** One decimal place for percentages. */
export function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}
