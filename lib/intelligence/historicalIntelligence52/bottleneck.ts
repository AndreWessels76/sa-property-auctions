import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi52BottleneckRank } from "./types";
import { deriveHi52ExecutionState } from "./executionState";
import { filterMissingExtraction, filterP1Eligible, filterLegacyEligible } from "./stages";

const PRIORITY_ORDER = [
  "FETCH_NOT_ATTEMPTED",
  "LEGACY_UNKNOWN_FAILURE",
  "MISSING_EXTRACTION",
  "FETCH_FAILURE",
  "OUTCOME_MISSING",
  "SALE_PRICE_MISSING",
  "IDENTITY_REVIEW",
  "SOURCE_BLOCKED",
] as const;

const ACTIONS: Record<string, string> = {
  FETCH_NOT_ATTEMPTED: "Acquire P1 (5)",
  LEGACY_UNKNOWN_FAILURE: "Retry Legacy Failures (5)",
  MISSING_EXTRACTION: "Extract Existing Snapshots (5)",
  FETCH_FAILURE: "Retry Failed (P2) — retryable only",
  OUTCOME_MISSING: "Resolve Evidence (HI 4.2)",
  SALE_PRICE_MISSING: "Quality Audit (HEQ 4.4) — explicit sale evidence only",
  IDENTITY_REVIEW: "Admin identity review — do not auto-merge",
  SOURCE_BLOCKED: "Review source / licensing",
};

export function rankBottlenecks(events: Hi50EventRow[]): Hi52BottleneckRank[] {
  const total = events.length;
  const buckets: Record<string, number> = {
    FETCH_NOT_ATTEMPTED: filterP1Eligible(events).length,
    LEGACY_UNKNOWN_FAILURE: filterLegacyEligible(events).length,
    MISSING_EXTRACTION: filterMissingExtraction(events).length,
    FETCH_FAILURE: events.filter((e) => {
      const { state } = deriveHi52ExecutionState(e);
      return state === "FETCH_FAILED" || state === "FETCH_RETRYABLE";
    }).length,
    OUTCOME_MISSING: events.filter(
      (e) =>
        (e.extraction === "SUCCESS" || e.extraction === "COMPLETE") &&
        (e.outcome === "UNKNOWN" || e.outcome === "MISSING"),
    ).length,
    SALE_PRICE_MISSING: events.filter(
      (e) => e.outcome === "SOLD" && e.salePrice !== "VERIFIED",
    ).length,
    IDENTITY_REVIEW: events.filter((e) => e.resolution === "REVIEW_REQUIRED").length,
    SOURCE_BLOCKED: events.filter((e) => e.recoveryPriority === 4).length,
  };

  const ranked: Hi52BottleneckRank[] = [];
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

export function primaryBottleneck(events: Hi50EventRow[]): Hi52BottleneckRank {
  const ranked = rankBottlenecks(events);
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
