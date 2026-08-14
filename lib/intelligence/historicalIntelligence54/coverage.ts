import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi54CoverageRates, Hi54EvidenceQualityCounts } from "./types";

function rate(numerator: number, denominator: number): number | "INSUFFICIENT_DATA" {
  if (denominator <= 0) return "INSUFFICIENT_DATA";
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function computeCoverageRates(input: {
  historicalEvents: number;
  licensedSources: number;
  fetchAttempted: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  verifiedSalePrices: number;
}): Hi54CoverageRates {
  return {
    sourceCoverage: rate(input.licensedSources, input.historicalEvents),
    fetchCoverage: rate(input.fetchAttempted, input.historicalEvents),
    snapshotCoverage: rate(input.snapshots, input.historicalEvents),
    extractionCoverage: rate(input.extractions, input.historicalEvents),
    outcomeCoverage: rate(input.outcomeEvidence, input.historicalEvents),
    salePriceCoverage: rate(input.verifiedSalePrices, input.historicalEvents),
  };
}

export function countEvidenceQuality(events: Hi50EventRow[]): Hi54EvidenceQualityCounts {
  const counts: Hi54EvidenceQualityCounts = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INSUFFICIENT_DATA: 0,
    CONFLICT: 0,
    REVIEW_REQUIRED: 0,
    UNKNOWN: 0,
  };

  for (const e of events) {
    const q = (e.evidenceQuality ?? "").toUpperCase();
    if (q === "HIGH") counts.HIGH++;
    else if (q === "MEDIUM") counts.MEDIUM++;
    else if (q === "LOW") counts.LOW++;
    else if (q === "INSUFFICIENT_DATA") counts.INSUFFICIENT_DATA++;
    else if (q === "CONFLICT" || e.evidenceState === "CONFLICT") counts.CONFLICT++;
    else if (e.resolution === "REVIEW_REQUIRED") counts.REVIEW_REQUIRED++;
    else counts.UNKNOWN++;
  }

  return counts;
}

export function parseLeadingInt(value: string | number, fallback = 0): number {
  if (typeof value === "number") return value;
  const m = String(value).match(/^(\d+)/);
  return m ? Number(m[1]) : fallback;
}
