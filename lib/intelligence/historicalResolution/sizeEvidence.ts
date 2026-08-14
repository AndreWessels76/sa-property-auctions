/**
 * Property size evidence — floor vs land separation (HI 4.2).
 */

import { isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";

const ACRES_TO_HA = 0.404686;

export type SizeEvidence = {
  floorSizeM2: number | null;
  landSizeM2: number | null;
  hectares: number | null;
  hectaresApproximate: boolean;
  sourceText: string | null;
};

export function parseHectaresFromText(text: string): { value: number | null; approximate: boolean } {
  const haystack = text || "";
  const approxMatch = haystack.match(/±\s*([\d,.]+)\s*(?:ha|hectare)/i);
  if (approxMatch?.[1]) {
    const value = Number(approxMatch[1].replace(/,/g, ""));
    return { value: Number.isFinite(value) && value > 0 ? value : null, approximate: true };
  }
  const haMatch = haystack.match(/([\d,.]+)\s*(?:ha|hectare|hectares)/i);
  if (haMatch?.[1]) {
    const value = Number(haMatch[1].replace(/,/g, ""));
    return { value: Number.isFinite(value) && value > 0 ? value : null, approximate: false };
  }
  const acreMatch = haystack.match(/([\d,.]+)\s*(?:acres?|ac\b)/i);
  if (acreMatch?.[1]) {
    const acres = Number(acreMatch[1].replace(/,/g, ""));
    if (Number.isFinite(acres) && acres > 0) {
      return { value: acres * ACRES_TO_HA, approximate: false };
    }
  }
  return { value: null, approximate: false };
}

export function buildSizeEvidence(input: {
  floorSizeM2?: number | null;
  erfSizeM2?: number | null;
  hectares?: number | null;
  hectaresApproximate?: boolean;
  evidenceText?: string | null;
}): SizeEvidence {
  const parsed = input.evidenceText ? parseHectaresFromText(input.evidenceText) : { value: null, approximate: false };
  const hectares =
    isValidPositiveArea(input.hectares) ? input.hectares! : parsed.value;
  const hectaresApproximate = Boolean(
    input.hectaresApproximate || (parsed.approximate && hectares != null),
  );

  return {
    floorSizeM2: isValidPositiveArea(input.floorSizeM2) ? input.floorSizeM2! : null,
    landSizeM2: isValidPositiveArea(input.erfSizeM2) ? input.erfSizeM2! : null,
    hectares,
    hectaresApproximate,
    sourceText: input.evidenceText ?? null,
  };
}
