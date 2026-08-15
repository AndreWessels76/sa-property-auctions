import {
  HI56_MINIMUM_COMPARABLE_SALES,
  HI56_MINIMUM_MARKET_SALES,
  HI56_P1_BASELINE_CANDIDATES,
} from "./config";
import type { Hi56CampaignStatus, Hi56P1Progress, Hi56Verdict } from "./types";

function progressBar(processed: number, original: number, width = 16): string {
  if (original <= 0) return "░".repeat(width);
  const ratio = Math.min(1, processed / original);
  const filled = Math.round(ratio * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

export function buildP1Progress56(input: {
  neverAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  permanent: number;
  baseline?: number;
}): Hi56P1Progress {
  const remaining = Math.max(0, input.neverAttempted);
  const baseline = input.baseline ?? HI56_P1_BASELINE_CANDIDATES;
  const originalP1 = Math.max(baseline, remaining);
  const processed = Math.max(0, originalP1 - remaining);
  const progressPercent =
    originalP1 <= 0 ? 0 : Math.round((processed / originalP1) * 1000) / 10;

  return {
    originalP1,
    processed,
    remaining,
    blocked: input.permanent,
    successful: input.fetchSuccessful,
    failed: input.fetchFailed,
    progressPercent,
    progressBar: progressBar(processed, originalP1),
    progressLabel: `${processed} / ${originalP1}`,
  };
}

export function deriveHi56CampaignStatus(input: {
  catalogueLeaks: number;
  historicalEvents: number;
  neverAttempted: number;
  fetchAttempted: number;
  verifiedSalePrices: number;
  verifiedSold: number;
  reviewRequired: number;
  remainingActionable: number;
}): Hi56CampaignStatus {
  if (input.catalogueLeaks > 0) return "CAMPAIGN_BLOCKED";
  if (input.historicalEvents <= 0) return "CAMPAIGN_NOT_STARTED";
  if (
    input.neverAttempted === 0 &&
    input.verifiedSalePrices >= HI56_MINIMUM_MARKET_SALES &&
    input.verifiedSold > 0
  ) {
    return "CAMPAIGN_DATA_COVERED";
  }
  if (input.reviewRequired > 0 && input.neverAttempted === 0) {
    return "CAMPAIGN_AWAITING_REVIEW";
  }
  if (
    input.neverAttempted === 0 &&
    input.remainingActionable === 0 &&
    input.reviewRequired === 0
  ) {
    return "CAMPAIGN_COMPLETE";
  }
  if (input.fetchAttempted <= 0 && input.neverAttempted > 0) {
    return "CAMPAIGN_NOT_STARTED";
  }
  if (input.fetchAttempted > 0 || input.neverAttempted > 0) {
    return "CAMPAIGN_IN_PROGRESS";
  }
  return "CAMPAIGN_NOT_STARTED";
}

export function isDataCoverageImproving56(input: {
  neverAttempted: number;
  baseline?: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
}): boolean {
  const baseline = input.baseline ?? HI56_P1_BASELINE_CANDIDATES;
  const ready =
    input.verifiedSalePrices >= HI56_MINIMUM_MARKET_SALES &&
    input.comparableReady >= HI56_MINIMUM_COMPARABLE_SALES &&
    input.marketReadyTowns >= 1;
  return input.neverAttempted < baseline && !ready;
}

export function isDataCoverageReady56(input: {
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
}): boolean {
  return (
    input.verifiedSalePrices >= HI56_MINIMUM_MARKET_SALES &&
    input.comparableReady >= HI56_MINIMUM_COMPARABLE_SALES &&
    input.marketReadyTowns >= 1
  );
}

export function deriveHi56Verdict(input: {
  catalogueLeaks: number;
  status: Hi56CampaignStatus;
  dataCoverageImproving: boolean;
  dataCoverageReady: boolean;
}): { verdict: Hi56Verdict; reason: string } {
  if (input.catalogueLeaks > 0) {
    return {
      verdict: "PUBLIC_CATALOGUE_SAFETY_BLOCKED",
      reason: `Catalogue leaks = ${input.catalogueLeaks}`,
    };
  }
  if (input.dataCoverageReady || input.status === "CAMPAIGN_DATA_COVERED") {
    return {
      verdict: "DATA COVERAGE READY",
      reason: `Verified sale prices ≥ ${HI56_MINIMUM_MARKET_SALES}; comparables ≥ ${HI56_MINIMUM_COMPARABLE_SALES}`,
    };
  }
  if (input.status === "CAMPAIGN_COMPLETE") {
    return {
      verdict: "CAMPAIGN COMPLETE",
      reason: "All eligible historical events reached a terminal evidence state",
    };
  }
  if (input.status === "CAMPAIGN_IN_PROGRESS") {
    if (input.dataCoverageImproving) {
      return {
        verdict: "DATA COVERAGE IMPROVING",
        reason: "P1 recovery progressed — evidence thresholds not yet met",
      };
    }
    return {
      verdict: "CAMPAIGN IN PROGRESS",
      reason: "Historical evidence recovery still has unattempted or incomplete events",
    };
  }
  return {
    verdict: "ENGINE READY / DATA COVERAGE INSUFFICIENT",
    reason: "Campaign engine ready — verified evidence thresholds not met",
  };
}
