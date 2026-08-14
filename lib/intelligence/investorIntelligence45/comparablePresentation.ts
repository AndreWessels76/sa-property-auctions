/**
 * Explainable comparable presentation — extends existing ComparableRow.
 */

import type { ComparableRow } from "@/lib/intelligence/comparables/types";
import type { ComparablePresentation } from "./types";

function strengthLabel(points: number, max: number): string {
  const ratio = max > 0 ? points / max : 0;
  if (ratio >= 0.75) return "strong";
  if (ratio >= 0.4) return "medium";
  if (points > 0) return "weak";
  return "none";
}

export function buildComparableExplanation(row: ComparableRow): string[] {
  const s = row.score;
  const lines: string[] = [
    `Comparable confidence: ${row.comparableConfidence.toUpperCase()}`,
    "",
    `Location: ${strengthLabel(s.location_match, 35)}`,
    `Property type: ${strengthLabel(s.property_type_match, 25)}`,
    `Size: ${strengthLabel(s.size_similarity + s.land_similarity, 30)}`,
    `Sale evidence: ${row.saleEvidence.verifiedSale ? "verified" : "not verified"}`,
    `Sale price: ${row.saleEvidence.salePrice != null ? "verified" : "not supplied"}`,
    `Evidence quality: ${row.saleEvidence.verifiedSale ? "HIGH" : "INSUFFICIENT"}`,
  ];
  if (row.matchingEvidence.length) {
    lines.push("", "Matching signals:", ...row.matchingEvidence.map((m) => `- ${m}`));
  }
  if (row.rejectionCodes?.length) {
    lines.push("", "Rejection codes:", ...row.rejectionCodes.map((c) => `- ${c}`));
  }
  return lines;
}

export function presentComparable(row: ComparableRow): ComparablePresentation {
  return {
    row,
    explanation: buildComparableExplanation(row),
    confidenceLabel: row.comparableConfidence,
  };
}

export function presentComparables(rows: ComparableRow[]): ComparablePresentation[] {
  return rows.map(presentComparable);
}
