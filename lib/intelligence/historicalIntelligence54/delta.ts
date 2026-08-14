import type { Hi51RecoverySnapshot } from "@/lib/intelligence/historicalIntelligence51";
import type { Hi53ExplicitDelta, Hi53MetricChange } from "@/lib/intelligence/historicalIntelligence53";

type SnapshotWithNever = Hi51RecoverySnapshot & { neverAttempted: number };

function change(
  key: string,
  label: string,
  before: number,
  after: number,
): Hi53MetricChange {
  const delta = after - before;
  const sign = delta > 0 ? "+" : "";
  return {
    key,
    label,
    before,
    after,
    delta,
    line: `${label}: ${before} → ${after}  (${sign}${delta})`,
  };
}

/** Always include every metric — never hide zero changes. */
export function buildExplicitCampaignDelta54(input: {
  before: SnapshotWithNever;
  after: SnapshotWithNever;
}): Hi53ExplicitDelta {
  const changes: Hi53MetricChange[] = [
    change("neverAttempted", "Unattempted", input.before.neverAttempted, input.after.neverAttempted),
    change("fetchAttempted", "Fetch attempted", input.before.fetchAttempted, input.after.fetchAttempted),
    change("fetchSuccessful", "Fetch successful", input.before.fetchSuccessful, input.after.fetchSuccessful),
    change("fetchFailed", "Fetch failed", input.before.fetchFailed, input.after.fetchFailed),
    change("snapshots", "Snapshots", input.before.snapshots, input.after.snapshots),
    change("extractions", "Extractions", input.before.extractions, input.after.extractions),
    change("outcomeEvidence", "Outcomes", input.before.outcomeEvidence, input.after.outcomeEvidence),
    change("verifiedSold", "Verified SOLD", input.before.verifiedSold, input.after.verifiedSold),
    change(
      "verifiedSalePrices",
      "Sale prices",
      input.before.verifiedSalePrices,
      input.after.verifiedSalePrices,
    ),
    change(
      "comparableReady",
      "Comparable-ready",
      input.before.comparableReady,
      input.after.comparableReady,
    ),
  ];

  const improved = changes.some(
    (c) =>
      (c.key === "fetchSuccessful" ||
        c.key === "snapshots" ||
        c.key === "extractions" ||
        c.key === "outcomeEvidence" ||
        c.key === "verifiedSold" ||
        c.key === "verifiedSalePrices") &&
      c.delta > 0,
  );

  return {
    before: input.before,
    after: input.after,
    changes,
    lines: changes.map((c) => c.line),
    improved,
  };
}

export function withNeverAttempted54(
  snap: Hi51RecoverySnapshot,
  neverAttempted: number,
): SnapshotWithNever {
  return { ...snap, neverAttempted };
}

export function formatAcquireBeforeAfter(input: {
  candidates: number;
  before: SnapshotWithNever;
  after: SnapshotWithNever;
}): { beforeLines: string[]; afterLines: string[] } {
  return {
    beforeLines: [
      `Candidates: ${input.candidates}`,
      `Fetch attempted: ${input.before.fetchAttempted}`,
      `Successful: ${input.before.fetchSuccessful}`,
      `Failed: ${input.before.fetchFailed}`,
      `Verified SOLD: ${input.before.verifiedSold}`,
      `Verified prices: ${input.before.verifiedSalePrices}`,
    ],
    afterLines: [
      `Candidates: ${input.candidates}`,
      `Fetch attempted: ${input.after.fetchAttempted}`,
      `Successful: ${input.after.fetchSuccessful}`,
      `Failed: ${input.after.fetchFailed}`,
      `Snapshots: +${Math.max(0, input.after.snapshots - input.before.snapshots)}`,
      `Extractions: +${Math.max(0, input.after.extractions - input.before.extractions)}`,
      `Outcomes: +${Math.max(0, input.after.outcomeEvidence - input.before.outcomeEvidence)}`,
      `Verified SOLD: +${Math.max(0, input.after.verifiedSold - input.before.verifiedSold)}`,
      `Verified sale prices: +${Math.max(0, input.after.verifiedSalePrices - input.before.verifiedSalePrices)}`,
    ],
  };
}
