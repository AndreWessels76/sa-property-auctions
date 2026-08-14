/**
 * Deterministic evidence coverage scoring (II 4.6).
 */

import { INVESTOR_INTELLIGENCE46_VERSION } from "./config";
import type {
  CoverageLevel,
  DimensionCoverage,
  EvidenceCoverageScore,
  FieldEvidence,
} from "./types";

function fieldScore(f: FieldEvidence): number {
  if (f.status === "CONFLICT") return 0;
  if (f.status === "VERIFIED" || f.status === "FACT") return 3;
  if (f.status === "SOURCE_CONFIRMED") return 2;
  if (f.status === "EXTRACTED" || f.status === "CALCULATED") return 1;
  if (f.status === "INFERRED") return 1;
  return 0;
}

function levelFromRatio(present: number, total: number, hasConflict: boolean): CoverageLevel {
  if (hasConflict) return "CONFLICT";
  if (total === 0 || present === 0) return "INSUFFICIENT_DATA";
  const ratio = present / total;
  if (ratio >= 0.75) return "HIGH";
  if (ratio >= 0.45) return "MEDIUM";
  if (ratio >= 0.2) return "LOW";
  return "INSUFFICIENT_DATA";
}

function dim(
  dimension: DimensionCoverage["dimension"],
  fields: FieldEvidence[],
  reasons: string[] = [],
): DimensionCoverage {
  const hasConflict = fields.some((f) => f.status === "CONFLICT");
  const score = fields.reduce((s, f) => s + fieldScore(f), 0);
  const maxScore = fields.length * 3;
  const fieldsPresent = fields.filter((f) => f.status !== "NOT_SUPPLIED" && f.status !== "NOT_FOUND").length;
  return {
    dimension,
    level: levelFromRatio(fieldsPresent, fields.length, hasConflict),
    score,
    maxScore,
    fieldsPresent,
    fieldsTotal: fields.length,
    reasons,
  };
}

export function buildEvidenceCoverage(input: {
  identity: FieldEvidence[];
  property: FieldEvidence[];
  auction: FieldEvidence[];
  pricing: FieldEvidence[];
  historical: FieldEvidence[];
  comparables: FieldEvidence[];
  market: FieldEvidence[];
  hasConflict?: boolean;
}): EvidenceCoverageScore {
  const dimensions: DimensionCoverage[] = [
    dim("identity", input.identity),
    dim("property", input.property),
    dim("auction", input.auction),
    dim("pricing", input.pricing),
    dim("historical", input.historical),
    dim("comparables", input.comparables),
    dim("market", input.market),
  ];

  if (input.hasConflict) {
    for (const d of dimensions) {
      if (d.level !== "CONFLICT" && input.hasConflict) {
        /* overall conflict takes precedence */
      }
    }
  }

  let overall: CoverageLevel = "INSUFFICIENT_DATA";
  if (input.hasConflict || dimensions.some((d) => d.level === "CONFLICT")) {
    overall = "CONFLICT";
  } else {
    const highCount = dimensions.filter((d) => d.level === "HIGH").length;
    const mediumCount = dimensions.filter((d) => d.level === "MEDIUM").length;
    const lowCount = dimensions.filter((d) => d.level === "LOW").length;
    if (highCount >= 4) overall = "HIGH";
    else if (highCount + mediumCount >= 3) overall = "MEDIUM";
    else if (highCount + mediumCount + lowCount >= 2) overall = "LOW";
    else overall = "INSUFFICIENT_DATA";
  }

  return {
    overall,
    dimensions,
    provenance: { version: INVESTOR_INTELLIGENCE46_VERSION },
  };
}

export function stableSortByField<T extends { field: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.field.localeCompare(b.field));
}
