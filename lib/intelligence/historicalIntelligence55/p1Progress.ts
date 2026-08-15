import { HI55_P1_BASELINE_CANDIDATES } from "./config";
import type { Hi55P1Progress } from "./types";

function progressBar(processed: number, original: number, width = 16): string {
  if (original <= 0) return "░".repeat(width);
  const ratio = Math.min(1, processed / original);
  const filled = Math.round(ratio * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

export function buildP1Progress55(input: {
  neverAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  retryable: number;
  permanent: number;
  reviewRequired: number;
  baseline?: number;
}): Hi55P1Progress {
  const remaining = Math.max(0, input.neverAttempted);
  const baseline = input.baseline ?? HI55_P1_BASELINE_CANDIDATES;
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
