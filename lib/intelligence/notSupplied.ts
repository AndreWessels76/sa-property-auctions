/** Canonical missing-data labels. Never replace with a plausible value. */

export const NOT_SUPPLIED = "Not supplied";
export const NOT_ENOUGH_VERIFIED_DATA = "Not enough verified data";
export const INSUFFICIENT_SAMPLE = "Insufficient sample";
export const INSUFFICIENT_VERIFIED_COMPARABLES = "Insufficient verified comparables";

export function displaySupplied(
  value: string | number | boolean | null | undefined,
): { text: string; supplied: boolean } {
  if (value == null) return { text: NOT_SUPPLIED, supplied: false };
  if (typeof value === "string" && !value.trim()) {
    return { text: NOT_SUPPLIED, supplied: false };
  }
  if (typeof value === "boolean") {
    return { text: value ? "Yes" : "No", supplied: true };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { text: NOT_SUPPLIED, supplied: false };
    return { text: String(value), supplied: true };
  }
  return { text: value.trim(), supplied: true };
}

export function hasNumericValue(value: number | null | undefined): boolean {
  return value != null && Number.isFinite(value);
}
