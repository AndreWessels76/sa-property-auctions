import { HI51_DEFAULT_BATCH_LIMIT } from "./config";
import type { Hi51P1BatchSlot, Hi51P1Progress } from "./types";

export function computeP1Progress(input: {
  remainingNeverAttempted: number;
  processedFromBatches?: number;
  batchSize?: number;
}): Hi51P1Progress {
  const batchSize = input.batchSize ?? HI51_DEFAULT_BATCH_LIMIT;
  const remaining = Math.max(0, input.remainingNeverAttempted);
  const processed = Math.max(0, (input.processedFromBatches ?? 0));
  const originalCandidates = remaining + processed;

  const batches: Hi51P1BatchSlot[] = [];
  const totalBatches = Math.ceil(originalCandidates / batchSize) || (remaining > 0 ? 1 : 0);

  for (let b = 1; b <= totalBatches; b++) {
    const batchStart = (b - 1) * batchSize;
    const batchEnd = b * batchSize;
    const batchProcessed = Math.max(0, Math.min(batchSize, processed - batchStart));
    const batchRemaining = Math.max(0, originalCandidates - Math.min(processed, batchEnd));

    let status: Hi51P1BatchSlot["status"] = "planned";
    if (batchProcessed >= batchSize) status = "completed";
    else if (batchProcessed > 0) status = "completed";
    else if (batchStart === processed && remaining > 0) status = "next";

    batches.push({
      batchNumber: b,
      processed: batchProcessed,
      remaining: batchRemaining,
      status,
    });
  }

  return {
    originalCandidates,
    processed,
    remaining,
    batchSize,
    batches,
  };
}
