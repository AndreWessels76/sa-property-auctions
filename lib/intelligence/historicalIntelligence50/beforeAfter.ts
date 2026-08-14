import type { Hsc48Metrics } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { Hi50BeforeAfterSnapshot, Hi50DeltaLine } from "./types";

export function snapshotMetrics(metrics: Hsc48Metrics, outcomeEvidence: number): Hi50BeforeAfterSnapshot {
  return {
    fetchAttempted: metrics.fetchAttempted,
    snapshots: metrics.snapshots,
    extractions: metrics.extractionAttempted,
    outcomeEvidence,
    verifiedSold: metrics.verifiedSold,
    verifiedSalePrices: metrics.verifiedSalePrices,
    comparableReady: metrics.comparableReady,
  };
}

export function formatDeltaLines(
  before: Hi50BeforeAfterSnapshot,
  after: Hi50BeforeAfterSnapshot,
): Hi50DeltaLine[] {
  const lines: Hi50DeltaLine[] = [];
  const fields: (keyof Hi50BeforeAfterSnapshot)[] = [
    "fetchAttempted",
    "snapshots",
    "extractions",
    "outcomeEvidence",
    "verifiedSold",
    "verifiedSalePrices",
    "comparableReady",
  ];

  const labels: Record<keyof Hi50BeforeAfterSnapshot, string> = {
    fetchAttempted: "fetch attempts",
    snapshots: "snapshots",
    extractions: "extractions",
    outcomeEvidence: "outcome evidence",
    verifiedSold: "verified SOLD",
    verifiedSalePrices: "verified sale prices",
    comparableReady: "comparable ready",
  };

  for (const field of fields) {
    const delta = after[field] - before[field];
    if (delta === 0) continue;
    const sign = delta > 0 ? "+" : "";
    lines.push(`${sign}${delta} ${labels[field]}`);
  }

  if (lines.length === 0) {
    lines.push("No metric change");
  }

  return lines;
}
