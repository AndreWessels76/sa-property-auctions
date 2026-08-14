/**
 * Size normalisation for pricing eligibility (floor / land / hectares / acres).
 * Reuses land math constants; never confuses erf with floor size.
 */

import { acresToHectares, ACRE_TO_HECTARES } from "./pricingParser";

export type FloorSizeNorm = {
  m2: number;
  isApproximate: boolean;
  originalText: string;
};

export type LandSizeNorm = {
  hectares: number | null;
  m2: number | null;
  acres: number | null;
  isApproximate: boolean;
  originalText: string;
  unitDetected: "ha" | "m2" | "acres" | null;
  /** Present when hectares were calculated from acres. */
  conversionMethod: string | null;
};

const SQM_PER_HA = 10_000;

function parseNum(raw: string): number | null {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Floor / building area only — never erf size alone.
 */
export function normalizeFloorSizeFromText(text: string): FloorSizeNorm | null {
  if (!text?.trim()) return null;
  const approximate = /[±~≈]|approx/i.test(text);

  const patterns = [
    /(?:floor|building|gross\s*building|gla)\s*(?:area|size)?\s*[:\-]?\s*[±~≈]?\s*([\d]+(?:[.,]\d+)?)\s*(?:m²|m2|sqm|square\s*metres?)/i,
    /[±~≈]?\s*([\d]+(?:[.,]\d+)?)\s*(?:m²|m2|sqm)\s*(?:floor|building)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const m2 = parseNum(m[1]);
    if (m2 == null) continue;
    return {
      m2,
      isApproximate: approximate || /[±~≈]/.test(m[0]),
      originalText: m[0].trim(),
    };
  }
  return null;
}

/**
 * Land / hectares / acres — preserves ± and labels acre→ha as Calculated.
 */
export function normalizeLandSizeObservation(text: string): LandSizeNorm | null {
  if (!text?.trim()) return null;
  const approximate = /[±~≈]|approx|approximately|about|circa/i.test(text);

  const combined = text.match(
    /combined\s*extent\s*[:\-]?\s*[±~≈]?\s*([\d]+(?:[.,]\d+)?)\s*(ha|hectares?|m²|m2|sqm|acres?)/i,
  );
  if (combined) {
    return fromUnit(combined[1]!, combined[2]!, combined[0]!, approximate);
  }

  const ha = text.match(/[±~≈]?\s*([\d]+(?:[.,]\d+)?)\s*(ha|hectares?)\b/i);
  if (ha) {
    return fromUnit(ha[1]!, ha[2]!, ha[0]!, approximate || /[±~≈]/.test(ha[0]!));
  }

  const acres = text.match(/[±~≈]?\s*([\d]+(?:[.,]\d+)?)\s*(acres?)\b/i);
  if (acres) {
    return fromUnit(
      acres[1]!,
      acres[2]!,
      acres[0]!,
      approximate || /[±~≈]/.test(acres[0]!),
    );
  }

  // Land-labelled m² only (not floor/building)
  const landM2 = text.match(
    /(?:land|erf|stand|extent)\s*(?:size|area)?\s*[:\-]?\s*[±~≈]?\s*([\d]+(?:[.,]\d+)?)\s*(?:m²|m2|sqm)/i,
  );
  if (landM2) {
    return fromUnit(landM2[1]!, "m2", landM2[0]!, approximate || /[±~≈]/.test(landM2[0]!));
  }

  return null;
}

function fromUnit(
  rawNum: string,
  unitRaw: string,
  original: string,
  approximate: boolean,
): LandSizeNorm | null {
  const n = parseNum(rawNum);
  if (n == null) return null;
  const u = unitRaw.toLowerCase();

  if (u.startsWith("ha") || u.startsWith("hect")) {
    return {
      hectares: n,
      m2: Math.round(n * SQM_PER_HA * 100) / 100,
      acres: null,
      isApproximate: approximate,
      originalText: original.trim(),
      unitDetected: "ha",
      conversionMethod: null,
    };
  }

  if (u.startsWith("acre")) {
    const hectares = Math.round(acresToHectares(n) * 1e8) / 1e8;
    return {
      hectares,
      m2: Math.round(hectares * SQM_PER_HA * 100) / 100,
      acres: n,
      isApproximate: approximate,
      originalText: original.trim(),
      unitDetected: "acres",
      conversionMethod: `acres_to_hectares:${ACRE_TO_HECTARES}`,
    };
  }

  return {
    hectares: Math.round((n / SQM_PER_HA) * 10000) / 10000,
    m2: n,
    acres: null,
    isApproximate: approximate,
    originalText: original.trim(),
    unitDetected: "m2",
    conversionMethod: null,
  };
}
