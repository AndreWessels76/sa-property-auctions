import {
  HI55_MINIMUM_COMPARABLE_SALES,
  HI55_MINIMUM_MARKET_SALES,
  HI55_P1_BASELINE_CANDIDATES,
} from "./config";
import type { Hi55CampaignStatus, Hi55Verdict } from "./types";

export function deriveHi55CampaignStatus(input: {
  catalogueLeaks: number;
  historicalEvents: number;
  neverAttempted: number;
  fetchAttempted: number;
  verifiedSalePrices: number;
  verifiedSold: number;
  reviewRequired: number;
  remainingActionable: number;
}): Hi55CampaignStatus {
  if (input.catalogueLeaks > 0) return "CAMPAIGN_BLOCKED";
  if (input.historicalEvents <= 0) return "CAMPAIGN_NOT_STARTED";

  if (
    input.neverAttempted === 0 &&
    input.verifiedSalePrices >= HI55_MINIMUM_MARKET_SALES &&
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

/** Coverage is improving when P1 has progressed but thresholds are not yet met. */
export function isDataCoverageImproving(input: {
  neverAttempted: number;
  baseline?: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
}): boolean {
  const baseline = input.baseline ?? HI55_P1_BASELINE_CANDIDATES;
  const progressed = input.neverAttempted < baseline;
  const ready =
    input.verifiedSalePrices >= HI55_MINIMUM_MARKET_SALES &&
    input.comparableReady >= HI55_MINIMUM_COMPARABLE_SALES &&
    input.marketReadyTowns >= 1;
  return progressed && !ready;
}

export function isDataCoverageReady(input: {
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
}): boolean {
  return (
    input.verifiedSalePrices >= HI55_MINIMUM_MARKET_SALES &&
    input.comparableReady >= HI55_MINIMUM_COMPARABLE_SALES &&
    input.marketReadyTowns >= 1
  );
}

export function deriveHi55Verdict(input: {
  catalogueLeaks: number;
  status: Hi55CampaignStatus;
  dataCoverageImproving: boolean;
  dataCoverageReady: boolean;
}): { verdict: Hi55Verdict; reason: string } {
  if (input.catalogueLeaks > 0) {
    return {
      verdict: "PRODUCTION SAFETY BLOCKED",
      reason: `Catalogue leaks = ${input.catalogueLeaks}`,
    };
  }

  if (input.dataCoverageReady || input.status === "CAMPAIGN_DATA_COVERED") {
    return {
      verdict: "DATA COVERAGE READY",
      reason: `Verified sale prices ≥ ${HI55_MINIMUM_MARKET_SALES}; comparables ≥ ${HI55_MINIMUM_COMPARABLE_SALES}`,
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

  if (input.status === "CAMPAIGN_AWAITING_REVIEW") {
    return {
      verdict: "ENGINE READY / DATA COVERAGE INSUFFICIENT",
      reason: "Evidence exists but requires human review",
    };
  }

  return {
    verdict: "ENGINE READY / DATA COVERAGE INSUFFICIENT",
    reason: "Campaign engine ready — verified evidence thresholds not met",
  };
}
