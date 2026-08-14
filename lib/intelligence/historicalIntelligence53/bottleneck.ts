import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import {
  deriveHi52ExecutionState,
  filterLegacyEligible,
  filterMissingExtraction,
  filterP1Eligible,
} from "@/lib/intelligence/historicalIntelligence52";
import type { Hi53Bottleneck } from "./types";

const PRIORITY_ORDER = [
  "FETCH_NOT_ATTEMPTED",
  "FETCH_FAILED",
  "LEGACY_UNKNOWN_FAILURE",
  "SNAPSHOT_MISSING",
  "MISSING_EXTRACTION",
  "OUTCOME_MISSING",
  "SALE_PRICE_MISSING",
  "IDENTITY_REVIEW_REQUIRED",
  "QUALITY_REVIEW_REQUIRED",
] as const;

const ACTIONS: Record<string, string> = {
  FETCH_NOT_ATTEMPTED: "Acquire P1 (5)",
  FETCH_FAILED: "Retry Failed — retryable only",
  LEGACY_UNKNOWN_FAILURE: "Retry Legacy (5)",
  SNAPSHOT_MISSING: "Acquire P1 — successful fetch without snapshot",
  MISSING_EXTRACTION: "Extract Existing Snapshots (5)",
  OUTCOME_MISSING: "Resolve Evidence (HI 4.2)",
  SALE_PRICE_MISSING: "Quality Audit — explicit sale evidence only",
  IDENTITY_REVIEW_REQUIRED: "Admin identity review — do not auto-merge",
  QUALITY_REVIEW_REQUIRED: "Quality Audit (HEQ 4.4)",
};

export function rankBottlenecks53(events: Hi50EventRow[]): Hi53Bottleneck[] {
  const total = events.length;
  const buckets: Record<string, number> = {
    FETCH_NOT_ATTEMPTED: filterP1Eligible(events).length,
    FETCH_FAILED: events.filter((e) => {
      const { state } = deriveHi52ExecutionState(e);
      return state === "FETCH_FAILED" || state === "FETCH_RETRYABLE";
    }).length,
    LEGACY_UNKNOWN_FAILURE: filterLegacyEligible(events).length,
    SNAPSHOT_MISSING: events.filter(
      (e) =>
        (e.evidenceState === "FETCH_SUCCESS" || e.attemptNumber > 0) &&
        !e.snapshot &&
        e.failureClassification !== "LEGACY_UNKNOWN_FAILURE",
    ).length,
    MISSING_EXTRACTION: filterMissingExtraction(events).length,
    OUTCOME_MISSING: events.filter(
      (e) =>
        (e.extraction === "SUCCESS" || e.extraction === "COMPLETE") &&
        (e.outcome === "UNKNOWN" || e.outcome === "MISSING"),
    ).length,
    SALE_PRICE_MISSING: events.filter(
      (e) => e.outcome === "SOLD" && e.salePrice !== "VERIFIED",
    ).length,
    IDENTITY_REVIEW_REQUIRED: events.filter((e) => e.resolution === "REVIEW_REQUIRED").length,
    QUALITY_REVIEW_REQUIRED: events.filter(
      (e) =>
        e.evidenceQuality === "LOW" ||
        e.evidenceQuality === "INSUFFICIENT_DATA" ||
        e.evidenceQuality === "CONFLICT",
    ).length,
  };

  const ranked: Hi53Bottleneck[] = [];
  for (const code of PRIORITY_ORDER) {
    const count = buckets[code] ?? 0;
    if (count <= 0) continue;
    ranked.push({
      code,
      count,
      total,
      recommendedAction: ACTIONS[code] ?? "Review",
    });
  }
  return ranked;
}

export function primaryBottleneck53(events: Hi50EventRow[]): Hi53Bottleneck {
  const ranked = rankBottlenecks53(events);
  if (ranked.length === 0) {
    return {
      code: "NO_DATA",
      count: 0,
      total: events.length,
      recommendedAction: "INSUFFICIENT_DATA — no actionable bottleneck",
    };
  }
  return ranked[0];
}
