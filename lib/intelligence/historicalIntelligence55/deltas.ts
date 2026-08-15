import {
  buildExplicitCampaignDelta54,
  withNeverAttempted54,
  formatAcquireBeforeAfter,
} from "@/lib/intelligence/historicalIntelligence54";
import type { Hi51RecoverySnapshot } from "@/lib/intelligence/historicalIntelligence51";

export {
  buildExplicitCampaignDelta54 as buildExplicitCampaignDelta55,
  withNeverAttempted54 as withNeverAttempted55,
  formatAcquireBeforeAfter as formatAcquireBeforeAfter55,
};

/** P1 remaining before/after — always show actual numbers, never assume success. */
export function formatP1RemainingDelta55(input: {
  beforeRemaining: number;
  afterRemaining: number;
  attempted: number;
  successful: number;
  failed: number;
}): string[] {
  const processed = Math.max(0, input.beforeRemaining - input.afterRemaining);
  return [
    `P1 remaining`,
    `Before: ${input.beforeRemaining}`,
    `After: ${input.afterRemaining}`,
    `Processed: ${processed}`,
    `Attempted: ${input.attempted}`,
    `Successful: ${input.successful}`,
    `Failed: ${input.failed}`,
  ];
}

export function snapshotNeverAttempted55(
  snap: Hi51RecoverySnapshot,
  neverAttempted: number,
) {
  return withNeverAttempted54(snap, neverAttempted);
}
