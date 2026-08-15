import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import {
  filterLegacyEligible,
  filterMissingExtraction,
  filterP1Eligible,
} from "@/lib/intelligence/historicalIntelligence52";
import type { Hi56Bottleneck, Hi56BottleneckCode } from "./types";

/**
 * Highest-value bottleneck order for HI 5.6.
 * Always work the current largest blocking stage — not an outdated label.
 */
const PRIORITY: Hi56BottleneckCode[] = [
  "FETCH_NOT_ATTEMPTED",
  "LEGACY_UNKNOWN_FAILURE",
  "MISSING_EXTRACTION",
  "OUTCOME_MISSING",
  "SALE_PRICE_MISSING",
  "IDENTITY_REVIEW_REQUIRED",
  "CONFLICT",
  "QUALITY_REVIEW",
];

const ACTIONS: Record<Hi56BottleneckCode, string> = {
  FETCH_NOT_ATTEMPTED: "Dry Run P1 (5) → Acquire P1 (5)",
  LEGACY_UNKNOWN_FAILURE: "Dry Run Legacy (5) → Retry Legacy (5)",
  MISSING_EXTRACTION: "Extract Existing Snapshots (5)",
  OUTCOME_MISSING: "Resolve Evidence",
  SALE_PRICE_MISSING: "Quality Audit — explicit sale evidence only",
  IDENTITY_REVIEW_REQUIRED: "Admin identity review",
  CONFLICT: "Admin conflict review",
  QUALITY_REVIEW: "Quality Audit (HEQ 4.4)",
  NO_DATA: "No historical events",
};

export function rankBottlenecks56(events: Hi50EventRow[]): Hi56Bottleneck[] {
  const total = events.length || 1;
  const buckets: Record<Hi56BottleneckCode, number> = {
    FETCH_NOT_ATTEMPTED: filterP1Eligible(events).length,
    LEGACY_UNKNOWN_FAILURE: filterLegacyEligible(events).length,
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
    CONFLICT: events.filter(
      (e) => e.evidenceState === "CONFLICT" || e.evidenceQuality === "CONFLICT",
    ).length,
    QUALITY_REVIEW: events.filter(
      (e) =>
        e.evidenceQuality === "LOW" ||
        e.evidenceQuality === "INSUFFICIENT_DATA" ||
        e.evidenceQuality === "CONFLICT",
    ).length,
    NO_DATA: events.length === 0 ? 1 : 0,
  };

  const ranked: Hi56Bottleneck[] = [];
  for (const code of PRIORITY) {
    const count = buckets[code] ?? 0;
    if (count <= 0) continue;
    ranked.push({
      code,
      count,
      total: events.length,
      percentage: Math.round((count / total) * 1000) / 10,
      recommendedAction: ACTIONS[code],
    });
  }

  if (ranked.length === 0) {
    return [
      {
        code: "NO_DATA",
        count: 0,
        total: events.length,
        percentage: 0,
        recommendedAction: ACTIONS.NO_DATA,
      },
    ];
  }

  return ranked;
}

export function primaryBottleneck56(events: Hi50EventRow[]): Hi56Bottleneck {
  return rankBottlenecks56(events)[0];
}
