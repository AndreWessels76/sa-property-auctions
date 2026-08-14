import { HI54_MINIMUM_COMPARABLE_SALES, HI54_MINIMUM_MARKET_SALES, HI54_P1_BASELINE_CANDIDATES } from "./config";
import type { Hi54CampaignStatus, Hi54P1Progress, Hi54Verdict } from "./types";

function progressBar(processed: number, original: number, width = 16): string {
  if (original <= 0) return "░".repeat(width);
  const ratio = Math.min(1, processed / original);
  const filled = Math.round(ratio * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

export function deriveHi54CampaignStatus(input: {
  catalogueLeaks: number;
  historicalEvents: number;
  neverAttempted: number;
  fetchAttempted: number;
  verifiedSalePrices: number;
  verifiedSold: number;
  reviewRequired: number;
  p4Blocked: number;
  remainingActionable: number;
}): Hi54CampaignStatus {
  if (input.catalogueLeaks > 0) return "CAMPAIGN_BLOCKED";
  if (input.historicalEvents <= 0) return "CAMPAIGN_NOT_STARTED";

  if (
    input.neverAttempted === 0 &&
    input.verifiedSalePrices >= HI54_MINIMUM_MARKET_SALES &&
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
    input.p4Blocked > 0
  ) {
    return "CAMPAIGN_BLOCKED";
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

export function deriveHi54Verdict(input: {
  liveDataUnavailable?: boolean;
  catalogueLeaks: number;
  status: Hi54CampaignStatus;
}): { verdict: Hi54Verdict; reason: string } {
  if (input.liveDataUnavailable || input.catalogueLeaks > 0) {
    return {
      verdict: "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE",
      reason:
        input.catalogueLeaks > 0
          ? `Catalogue leaks = ${input.catalogueLeaks}`
          : "Live data unavailable",
    };
  }

  switch (input.status) {
    case "CAMPAIGN_DATA_COVERED":
      return {
        verdict: "DATA COVERED — MARKET INTELLIGENCE AVAILABLE",
        reason: `Verified sale prices >= ${HI54_MINIMUM_MARKET_SALES}; comparables min ${HI54_MINIMUM_COMPARABLE_SALES}`,
      };
    case "CAMPAIGN_COMPLETE":
      return {
        verdict: "CAMPAIGN COMPLETE",
        reason: "All eligible historical events reached a terminal evidence state",
      };
    case "CAMPAIGN_AWAITING_REVIEW":
      return {
        verdict: "CAMPAIGN AWAITING REVIEW",
        reason: "Evidence exists but requires human review",
      };
    case "CAMPAIGN_IN_PROGRESS":
      return {
        verdict: "CAMPAIGN IN PROGRESS",
        reason: "Historical evidence recovery still has unattempted or incomplete events",
      };
    case "CAMPAIGN_BLOCKED":
      return {
        verdict: "INSUFFICIENT DATA — ENGINE READY",
        reason: "Remaining candidates blocked by permanent source/identity/licensing problems",
      };
    default:
      return {
        verdict: "INSUFFICIENT DATA — ENGINE READY",
        reason: "Campaign not started — engine ready for controlled P1 acquisition",
      };
  }
}

export function buildP1Progress54(input: {
  neverAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  retryable: number;
  permanent: number;
  reviewRequired: number;
  baseline?: number;
}): Hi54P1Progress {
  const remaining = Math.max(0, input.neverAttempted);
  const baseline = input.baseline ?? HI54_P1_BASELINE_CANDIDATES;
  const originalP1 = Math.max(baseline, remaining);
  const processed = Math.max(0, originalP1 - remaining);

  return {
    originalP1,
    processed,
    remaining,
    blocked: input.permanent,
    successful: input.fetchSuccessful,
    failed: input.fetchFailed,
    retryable: input.retryable,
    reviewRequired: input.reviewRequired,
    progressBar: progressBar(processed, originalP1),
    progressLabel: `${processed} / ${originalP1}`,
  };
}
