import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import {
  deriveHi52ExecutionState,
  filterMissingExtraction,
  filterP1Eligible,
} from "@/lib/intelligence/historicalIntelligence52";
import type { Hi54Bottleneck } from "./types";

const PRIORITY = [
  "FETCH_NOT_ATTEMPTED",
  "FETCH_FAILURE",
  "MISSING_SNAPSHOT",
  "MISSING_EXTRACTION",
  "MISSING_OUTCOME",
  "MISSING_SALE_PRICE",
  "IDENTITY_REVIEW_REQUIRED",
  "QUALITY_REVIEW_REQUIRED",
] as const;

const ACTIONS: Record<string, string> = {
  FETCH_NOT_ATTEMPTED: "Acquire P1 (5)",
  FETCH_FAILURE: "Retry Failed (5) / Retry Network Failures (5)",
  MISSING_SNAPSHOT: "Acquire P1 — successful fetch without snapshot",
  MISSING_EXTRACTION: "Extract Existing Snapshots (5)",
  MISSING_OUTCOME: "Resolve Evidence",
  MISSING_SALE_PRICE: "Quality Audit — explicit sale evidence only",
  IDENTITY_REVIEW_REQUIRED: "Admin identity review",
  QUALITY_REVIEW_REQUIRED: "Quality Audit (HEQ 4.4)",
};

export function rankBottlenecks54(events: Hi50EventRow[]): Hi54Bottleneck[] {
  const total = events.length || 1;
  const buckets: Record<string, number> = {
    FETCH_NOT_ATTEMPTED: filterP1Eligible(events).length,
    FETCH_FAILURE: events.filter((e) => {
      const { state } = deriveHi52ExecutionState(e);
      return (
        state === "FETCH_FAILED" ||
        state === "FETCH_RETRYABLE" ||
        e.failureClassification === "LEGACY_UNKNOWN_FAILURE"
      );
    }).length,
    MISSING_SNAPSHOT: events.filter(
      (e) =>
        e.attemptNumber > 0 &&
        !e.snapshot &&
        e.failureClassification !== "LEGACY_UNKNOWN_FAILURE",
    ).length,
    MISSING_EXTRACTION: filterMissingExtraction(events).length,
    MISSING_OUTCOME: events.filter(
      (e) =>
        (e.extraction === "SUCCESS" || e.extraction === "COMPLETE") &&
        (e.outcome === "UNKNOWN" || e.outcome === "MISSING"),
    ).length,
    MISSING_SALE_PRICE: events.filter(
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

  const ranked: Hi54Bottleneck[] = [];
  for (const code of PRIORITY) {
    const count = buckets[code] ?? 0;
    if (count <= 0) continue;
    ranked.push({
      code,
      count,
      total: events.length,
      percentage: Math.round((count / total) * 1000) / 10,
      recommendedAction: ACTIONS[code] ?? "Review",
    });
  }
  return ranked;
}

export function primaryBottleneck54(events: Hi50EventRow[]): Hi54Bottleneck {
  const ranked = rankBottlenecks54(events);
  if (ranked.length === 0) {
    return {
      code: "NO_DATA",
      count: 0,
      total: events.length,
      percentage: 0,
      recommendedAction: "INSUFFICIENT_DATA — no actionable bottleneck",
    };
  }
  return ranked[0];
}
