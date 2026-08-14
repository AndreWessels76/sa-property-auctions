import type { Hsc48EventDiagnostic } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { Hi50Bottleneck, Hi50BottleneckReport } from "./types";

const ACTION: Record<Hi50Bottleneck, string> = {
  FETCH_NOT_ATTEMPTED: "Acquire P1 batch (5)",
  FETCH_FAILURE: "Retry failed or retry network failures",
  SNAPSHOT_MISSING: "Acquire P1 batch — fetch successful but no snapshot",
  EXTRACTION_MISSING: "Extract existing snapshots",
  OUTCOME_MISSING: "Resolve evidence after extraction",
  SALE_PRICE_MISSING: "Quality audit — verify explicit sale price evidence",
  IDENTITY_REVIEW: "Admin identity review",
  SOURCE_BLOCKED: "Review licensed source / partner configuration",
  NO_DATA: "INSUFFICIENT_DATA — no actionable bottleneck",
};

export function detectBottleneck(events: Hsc48EventDiagnostic[]): Hi50BottleneckReport {
  const total = events.length;
  const buckets: Record<Hi50Bottleneck, number> = {
    FETCH_NOT_ATTEMPTED: events.filter((e) => !e.fetchAttempted).length,
    FETCH_FAILURE: events.filter((e) => e.fetchAttempted && !e.fetchSuccessful).length,
    SNAPSHOT_MISSING: events.filter(
      (e) => e.fetchSuccessful && !e.snapshot.exists,
    ).length,
    EXTRACTION_MISSING: events.filter(
      (e) => e.snapshot.exists && e.extraction.state === "NOT_RUN",
    ).length,
    OUTCOME_MISSING: events.filter((e) => e.outcomeState === "UNKNOWN" && e.extraction.state !== "NOT_RUN").length,
    SALE_PRICE_MISSING: events.filter(
      (e) =>
        e.outcomeState === "SOLD" &&
        e.salePriceState !== "VERIFIED" &&
        e.resolutionState !== "VERIFIED",
    ).length,
    IDENTITY_REVIEW: events.filter(
      (e) => e.primaryState === "IDENTITY_REVIEW_REQUIRED",
    ).length,
    SOURCE_BLOCKED: events.filter(
      (e) => e.source.sourceStatus === "LICENSE_BLOCKED" || e.primaryState === "SOURCE_LICENSE_BLOCKED",
    ).length,
    NO_DATA: 0,
  };

  let primary: Hi50Bottleneck = "NO_DATA";
  let count = 0;
  for (const [key, value] of Object.entries(buckets) as [Hi50Bottleneck, number][]) {
    if (key === "NO_DATA") continue;
    if (value > count) {
      primary = key;
      count = value;
    }
  }

  if (count === 0) {
    return {
      primary: "NO_DATA",
      count: 0,
      total,
      recommendedAction: ACTION.NO_DATA,
    };
  }

  return {
    primary,
    count,
    total,
    recommendedAction: ACTION[primary],
  };
}
