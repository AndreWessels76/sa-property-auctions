import { HI55_DEFAULT_BATCH_LIMIT } from "./config";
import type { Hi55BatchPlan } from "./types";

/** Plan remaining P1 into bounded batches of max 5 — never auto-run all. */
export function buildBatchPlan55(input: {
  remaining: number;
  batchSize?: number;
}): Hi55BatchPlan {
  const batchSize = Math.min(
    Math.max(input.batchSize ?? HI55_DEFAULT_BATCH_LIMIT, 1),
    HI55_DEFAULT_BATCH_LIMIT,
  );
  const remaining = Math.max(0, input.remaining);
  const batchesRequired = remaining === 0 ? 0 : Math.ceil(remaining / batchSize);
  const steps = [];
  let left = remaining;
  let cumulative = 0;
  for (let i = 1; i <= batchesRequired; i++) {
    const plannedSize = Math.min(batchSize, left);
    cumulative += plannedSize;
    left -= plannedSize;
    steps.push({
      batchNumber: i,
      plannedSize,
      cumulativeProcessed: cumulative,
      remainingAfter: left,
    });
  }

  return {
    remaining,
    batchSize,
    batchesRequired,
    steps,
    note:
      remaining === 0
        ? "No P1 candidates remaining — do not auto-acquire"
        : `${batchesRequired} admin-triggered batch(es) of ≤${batchSize} required — never process all ${remaining} automatically`,
  };
}

export function clampHi55BatchLimit(limit?: number): number {
  const n = limit ?? HI55_DEFAULT_BATCH_LIMIT;
  return Math.min(Math.max(n, 1), HI55_DEFAULT_BATCH_LIMIT);
}

export function rejectHi55UnlimitedLimit(limit: number | undefined): {
  ok: boolean;
  limit: number;
  error?: string;
} {
  if (limit == null) {
    return { ok: true, limit: HI55_DEFAULT_BATCH_LIMIT };
  }
  if (!Number.isFinite(limit) || limit < 1) {
    return { ok: false, limit: HI55_DEFAULT_BATCH_LIMIT, error: "limit must be >= 1" };
  }
  if (limit > HI55_DEFAULT_BATCH_LIMIT) {
    return {
      ok: false,
      limit: HI55_DEFAULT_BATCH_LIMIT,
      error: `limit > ${HI55_DEFAULT_BATCH_LIMIT} rejected`,
    };
  }
  return { ok: true, limit: Math.floor(limit) };
}
