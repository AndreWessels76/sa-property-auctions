/**
 * Flag unreliable location tokens — do not use for geographical matching.
 */

const BAD_LOCATION_TOKENS = new Set([
  "of",
  "pre-fab wall",
  "prefab wall",
  "unknown",
  "n/a",
  "na",
  "none",
  "not listed",
  "tbc",
  "tba",
]);

function isBadToken(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return BAD_LOCATION_TOKENS.has(value.trim().toLowerCase());
}

export function assessLocationQuality(input: {
  town?: string | null;
  suburb?: string | null;
  province?: string | null;
  farmName?: string | null;
  erfNumber?: string | null;
  streetAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): { ok: boolean; flags: string[] } {
  const flags: string[] = [];

  if (isBadToken(input.town)) flags.push("LOCATION_DATA_REVIEW");
  if (isBadToken(input.suburb)) flags.push("LOCATION_DATA_REVIEW");
  if (isBadToken(input.province)) flags.push("LOCATION_DATA_REVIEW");

  const hasLocation =
    Boolean(input.town?.trim() && !isBadToken(input.town)) ||
    Boolean(input.suburb?.trim() && !isBadToken(input.suburb)) ||
    Boolean(input.farmName?.trim()) ||
    Boolean(input.erfNumber?.trim()) ||
    Boolean(input.streetAddress?.trim()) ||
    (input.latitude != null && input.longitude != null);

  if (!hasLocation) {
    flags.push("INSUFFICIENT_LOCATION");
  }

  return { ok: flags.length === 0, flags };
}
