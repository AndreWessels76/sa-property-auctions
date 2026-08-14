import { HI53_DEFAULT_BATCH_LIMIT } from "./config";
import type {
  Hi53BatchPlanSlot,
  Hi53CampaignProgress,
  Hi53CampaignStatus,
  Hi53P1CampaignStats,
} from "./types";

function progressBar(ratio: number, width = 20): string {
  const filled = Math.max(0, Math.min(width, Math.round(ratio * width)));
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

export function deriveCampaignStatus(input: {
  catalogueLeaks: number;
  historicalEvents: number;
  neverAttempted: number;
  fetchAttempted: number;
  verifiedSalePrices: number;
  verifiedSold: number;
}): Hi53CampaignStatus {
  if (input.catalogueLeaks > 0) return "CAMPAIGN_BLOCKED";
  if (input.historicalEvents <= 0) return "CAMPAIGN_NOT_STARTED";
  if (input.fetchAttempted <= 0 && input.neverAttempted > 0) {
    return "CAMPAIGN_NOT_STARTED";
  }
  if (
    input.neverAttempted === 0 &&
    input.verifiedSalePrices > 0 &&
    input.verifiedSold > 0
  ) {
    return "CAMPAIGN_DATA_COVERED";
  }
  if (input.fetchAttempted > 0 && input.neverAttempted === 0) {
    return "CAMPAIGN_PARTIALLY_COVERED";
  }
  if (input.fetchAttempted > 0) return "CAMPAIGN_IN_PROGRESS";
  return "CAMPAIGN_NOT_STARTED";
}

export function buildCampaignProgress(input: {
  historicalEvents: number;
  neverAttempted: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  catalogueLeaks: number;
  verifiedSalePrices: number;
  verifiedSold: number;
}): Hi53CampaignProgress {
  const total = input.historicalEvents;
  const remaining = Math.max(0, input.neverAttempted);
  const attempted = Math.max(0, input.fetchAttempted);
  const ratio = total > 0 ? attempted / total : 0;
  const status = deriveCampaignStatus(input);

  return {
    status,
    totalEvents: total,
    neverAttempted: remaining,
    fetchAttempted: attempted,
    fetchSuccessful: input.fetchSuccessful,
    fetchFailed: input.fetchFailed,
    remaining,
    progressRatio: Math.round(ratio * 1000) / 1000,
    progressBar: progressBar(ratio),
    summaryLine: `${attempted} / ${total} attempted · ${input.fetchSuccessful} successful · ${input.fetchFailed} failed · ${remaining} remaining`,
  };
}

export function buildP1CampaignStats(input: {
  neverAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  retryable: number;
  permanent: number;
  batchSize?: number;
}): Hi53P1CampaignStats {
  const batchSize = input.batchSize ?? HI53_DEFAULT_BATCH_LIMIT;
  const remaining = Math.max(0, input.neverAttempted);
  return {
    total: remaining,
    completed: 0,
    remaining,
    successful: input.fetchSuccessful,
    failed: input.fetchFailed,
    retryable: input.retryable,
    permanent: input.permanent,
    batchSize,
    plannedBatches: Math.ceil(remaining / batchSize) || 0,
  };
}

export function buildBatchPlan(input: {
  remaining: number;
  batchSize?: number;
}): Hi53BatchPlanSlot[] {
  const batchSize = input.batchSize ?? HI53_DEFAULT_BATCH_LIMIT;
  const remaining = Math.max(0, input.remaining);
  if (remaining === 0) return [];

  const totalBatches = Math.ceil(remaining / batchSize);
  const slots: Hi53BatchPlanSlot[] = [];
  let left = remaining;

  for (let b = 1; b <= totalBatches; b++) {
    const size = Math.min(batchSize, left);
    left -= size;
    slots.push({
      batchNumber: b,
      size,
      status: b === 1 ? "next" : "planned",
      remainingAfter: left,
    });
  }
  return slots;
}
