/**
 * Land unit normalization — square metres, hectares, acres.
 * Never fabricates sizes; returns null when unknown.
 */

export type LandExtent = {
  squareMetres: number | null;
  hectares: number | null;
  acres: number | null;
  combinedLabel: string | null;
  sourceUnit: "m2" | "ha" | "acres" | "unknown" | null;
};

const SQM_PER_HA = 10_000;
const SQM_PER_ACRE = 4046.8564224;

function round(n: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function sqmToHectares(sqm: number): number {
  return round(sqm / SQM_PER_HA, 4);
}

export function sqmToAcres(sqm: number): number {
  return round(sqm / SQM_PER_ACRE, 4);
}

export function hectaresToSqm(ha: number): number {
  return round(ha * SQM_PER_HA, 2);
}

export function acresToSqm(acres: number): number {
  return round(acres * SQM_PER_ACRE, 2);
}

/**
 * Parse free-text land size ("12.5 ha", "4500 m²", "3 acres").
 */
export function parseLandSizeText(
  value: string | null | undefined,
): { sqm: number; unit: LandExtent["sourceUnit"] } | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase().replace(/,/g, " ");
  const numMatch = v.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return null;
  const n = Number(numMatch[1]);
  if (!Number.isFinite(n) || n <= 0) return null;

  if (/\bha\b|hectare/.test(v)) {
    return { sqm: hectaresToSqm(n), unit: "ha" };
  }
  if (/\bacre/.test(v)) {
    return { sqm: acresToSqm(n), unit: "acres" };
  }
  if (/m\s*2|m²|sqm|square\s*met/.test(v)) {
    return { sqm: n, unit: "m2" };
  }
  // Bare number: treat as m² for urban; large values may be m², small farm numbers often ha —
  // only accept bare numbers as m² when caller already stored numeric erf_size.
  return { sqm: n, unit: "m2" };
}

export function normalizeLandExtent(input: {
  erfSize?: number | null;
  landSizeText?: string | null;
  agriculturalHectares?: number | null;
}): LandExtent {
  let sqm: number | null = null;
  let sourceUnit: LandExtent["sourceUnit"] = null;

  if (
    typeof input.agriculturalHectares === "number" &&
    input.agriculturalHectares > 0
  ) {
    sqm = hectaresToSqm(input.agriculturalHectares);
    sourceUnit = "ha";
  }

  if (sqm == null && typeof input.erfSize === "number" && input.erfSize > 0) {
    // Convention in this codebase: erf_size is square metres.
    sqm = input.erfSize;
    sourceUnit = "m2";
  }

  if (sqm == null && input.landSizeText) {
    const parsed = parseLandSizeText(input.landSizeText);
    if (parsed) {
      sqm = parsed.sqm;
      sourceUnit = parsed.unit;
    }
  }

  if (sqm == null || sqm <= 0) {
    return {
      squareMetres: null,
      hectares: null,
      acres: null,
      combinedLabel: null,
      sourceUnit: null,
    };
  }

  const hectares = sqmToHectares(sqm);
  const acres = sqmToAcres(sqm);
  const combinedLabel =
    hectares >= 1
      ? `${hectares} ha (${Math.round(sqm).toLocaleString("en-ZA")} m²)`
      : `${Math.round(sqm).toLocaleString("en-ZA")} m²`;

  return {
    squareMetres: round(sqm, 2),
    hectares,
    acres,
    combinedLabel,
    sourceUnit,
  };
}

export function averageLandSquareMetres(
  extents: Array<number | null | undefined>,
): number | null {
  const values = extents.filter(
    (n): n is number => typeof n === "number" && n > 0,
  );
  if (values.length === 0) return null;
  return round(values.reduce((a, b) => a + b, 0) / values.length, 2);
}
