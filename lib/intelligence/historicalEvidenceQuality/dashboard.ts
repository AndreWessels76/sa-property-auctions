/**
 * Quality dashboard aggregates (HEQ 4.4).
 */

import type { EvidenceQualityAssessment, QualityDashboard } from "./types";
import type { QualityQueueItem } from "./reviewQueue";

export function buildQualityDashboard(input: {
  assessments: EvidenceQualityAssessment[];
  queue: QualityQueueItem[];
  totalHistorical: number;
}): QualityDashboard {
  const a = input.assessments;
  const withSource = a.filter((x) => x.sourceCount > 0).length;
  const withSnapshot = a.filter((x) => x.snapshotCount > 0).length;

  return {
    totalHistoricalEvents: input.totalHistorical,
    highQuality: a.filter((x) => x.overallQuality === "HIGH").length,
    mediumQuality: a.filter((x) => x.overallQuality === "MEDIUM").length,
    lowQuality: a.filter((x) => x.overallQuality === "LOW").length,
    reviewRequired: a.filter((x) => x.overallQuality === "REVIEW_REQUIRED").length,
    conflicts: a.filter((x) => x.overallQuality === "CONFLICT").length,
    insufficientData: a.filter((x) => x.overallQuality === "INSUFFICIENT_DATA").length,
    verifiedSold: a.filter(
      (x) =>
        x.fields.find((f) => f.field === "auction_outcome")?.value === "SOLD" &&
        x.fields.find((f) => f.field === "auction_outcome")?.status === "VERIFIED",
    ).length,
    verifiedSalePrices: a.filter(
      (x) => x.fields.find((f) => f.field === "sale_price")?.status === "VERIFIED",
    ).length,
    confirmedOutcomes: a.filter((x) => {
      const o = x.fields.find((f) => f.field === "auction_outcome");
      return (
        o &&
        o.value !== "UNKNOWN" &&
        o.value !== "COMPLETED_UNKNOWN" &&
        (o.status === "VERIFIED" || o.status === "SOURCE_CONFIRMED")
      );
    }).length,
    sourceCoverage: input.totalHistorical
      ? Math.round((withSource / input.totalHistorical) * 100)
      : 0,
    snapshotCoverage: input.totalHistorical
      ? Math.round((withSnapshot / input.totalHistorical) * 100)
      : 0,
    comparableReady: a.filter((x) => x.comparableEligible).length,
    reviewQueue: {
      p1: input.queue.filter((q) => q.priority === 1).length,
      p2: input.queue.filter((q) => q.priority === 2).length,
      p3: input.queue.filter((q) => q.priority === 3).length,
      p4: input.queue.filter((q) => q.priority === 4).length,
      total: input.queue.length,
    },
  };
}
