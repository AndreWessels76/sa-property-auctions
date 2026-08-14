import type { Hsc48Metrics } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { Hi51RecoveryDelta, Hi51RecoverySnapshot } from "./types";

export function buildRecoverySnapshot(
  metrics: Hsc48Metrics,
  outcomeEvidence: number,
): Hi51RecoverySnapshot {
  return {
    historicalEvents: metrics.historicalEvents,
    fetchAttempted: metrics.fetchAttempted,
    fetchSuccessful: metrics.successfulFetches,
    fetchFailed: metrics.failedFetches,
    snapshots: metrics.snapshots,
    extractions: metrics.extractionAttempted,
    outcomeEvidence,
    verifiedSold: metrics.verifiedSold,
    verifiedSalePrices: metrics.verifiedSalePrices,
    comparableReady: metrics.comparableReady,
    marketReadyTowns: metrics.marketReadyTowns,
    soldWithoutPrice: metrics.soldWithoutPrice,
  };
}

export function computeRecoveryDelta(
  before: Hi51RecoverySnapshot,
  after: Hi51RecoverySnapshot,
): Hi51RecoveryDelta {
  const fetchAttempts = after.fetchAttempted - before.fetchAttempted;
  const fetchSuccessful = after.fetchSuccessful - before.fetchSuccessful;
  const fetchFailed = after.fetchFailed - before.fetchFailed;
  const snapshots = after.snapshots - before.snapshots;
  const extractions = after.extractions - before.extractions;
  const outcomeEvidence = after.outcomeEvidence - before.outcomeEvidence;
  const verifiedSold = after.verifiedSold - before.verifiedSold;
  const verifiedSalePrices = after.verifiedSalePrices - before.verifiedSalePrices;
  const comparableReady = after.comparableReady - before.comparableReady;
  const marketReadyTowns = after.marketReadyTowns - before.marketReadyTowns;

  const lines: string[] = [];
  const push = (delta: number, label: string) => {
    if (delta === 0) return;
    lines.push(`${delta > 0 ? "+" : ""}${delta} ${label}`);
  };

  push(fetchAttempts, "fetch attempts");
  push(fetchSuccessful, "successful fetches");
  push(fetchFailed, "failed fetches");
  push(snapshots, "snapshots");
  push(extractions, "extractions");
  push(outcomeEvidence, "outcomes");
  push(verifiedSold, "verified SOLD");
  push(verifiedSalePrices, "verified sale prices");
  push(comparableReady, "comparable ready");
  push(marketReadyTowns, "market ready towns");

  if (lines.length === 0) {
    lines.push("No evidence metric change — HTTP may have executed without evidence gain");
  }

  const improved =
    fetchSuccessful > 0 ||
    snapshots > 0 ||
    extractions > 0 ||
    outcomeEvidence > 0 ||
    verifiedSold > 0 ||
    verifiedSalePrices > 0;

  return {
    fetchAttempts,
    fetchSuccessful,
    fetchFailed,
    snapshots,
    extractions,
    outcomeEvidence,
    verifiedSold,
    verifiedSalePrices,
    comparableReady,
    marketReadyTowns,
    lines,
    improved,
  };
}
