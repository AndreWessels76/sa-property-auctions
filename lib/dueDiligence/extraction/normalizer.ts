/**
 * Land unit normalization — preserve original wording + approximate flag.
 * Never invents sizes. Local math (no path-alias dependency).
 */

import type { LandMeasurement } from "./types";

const SQM_PER_HA = 10_000;
const SQM_PER_ACRE = 4046.8564224;

function round(n: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function hectaresToSqm(ha: number): number {
  return round(ha * SQM_PER_HA, 2);
}

function acresToSqm(acres: number): number {
  return round(acres * SQM_PER_ACRE, 2);
}

function sqmToHectares(sqm: number): number {
  return round(sqm / SQM_PER_HA, 4);
}

function sqmToAcres(sqm: number): number {
  return round(sqm / SQM_PER_ACRE, 4);
}

export function normalizeLandFromText(text: string): LandMeasurement | null {
  if (!text?.trim()) return null;

  const approximate = /[±~≈]|approx|about|circa|approximately/i.test(text);

  const combined = text.match(
    /combined\s*extent\s*[:\-]?\s*[±~≈]?\s*([\d]+(?:[.,]\d+)?)\s*(ha|hectares?|m²|m2|sqm|acres?)/i,
  );
  if (combined) {
    return fromNumber(combined[1]!, combined[2]!, combined[0]!, approximate);
  }

  const ha = text.match(/[±~≈]?\s*([\d]+(?:[.,]\d+)?)\s*(ha|hectares?)\b/i);
  if (ha) {
    return fromNumber(ha[1]!, ha[2]!, ha[0]!, approximate || /[±~≈]/.test(ha[0]!));
  }

  const acres = text.match(/[±~≈]?\s*([\d]+(?:[.,]\d+)?)\s*(acres?)\b/i);
  if (acres) {
    return fromNumber(
      acres[1]!,
      acres[2]!,
      acres[0]!,
      approximate || /[±~≈]/.test(acres[0]!),
    );
  }

  const sqm = text.match(
    /[±~≈]?\s*([\d]+(?:[.,]\d+)?)\s*(m²|m2|sqm|square\s*metres?)\b/i,
  );
  if (sqm) {
    return fromNumber(
      sqm[1]!,
      sqm[2]!,
      sqm[0]!,
      approximate || /[±~≈]/.test(sqm[0]!),
    );
  }

  return null;
}

function fromNumber(
  rawNum: string,
  unitRaw: string,
  original: string,
  approximate: boolean,
): LandMeasurement | null {
  const n = Number(rawNum.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = unitRaw.toLowerCase();

  if (u.startsWith("ha") || u.startsWith("hect")) {
    const hectares = n;
    const square_metres = hectaresToSqm(hectares);
    return {
      original_text: original.trim(),
      hectares,
      square_metres,
      acres: sqmToAcres(square_metres),
      approximate,
      unit_detected: "ha",
    };
  }
  if (u.startsWith("acre")) {
    const square_metres = acresToSqm(n);
    return {
      original_text: original.trim(),
      hectares: sqmToHectares(square_metres),
      square_metres,
      acres: n,
      approximate,
      unit_detected: "acres",
    };
  }
  return {
    original_text: original.trim(),
    hectares: sqmToHectares(n),
    square_metres: n,
    acres: sqmToAcres(n),
    approximate,
    unit_detected: "m2",
  };
}

export function hectaresFromSqm(sqm: number): number {
  return Math.round((sqm / SQM_PER_HA) * 10000) / 10000;
}
