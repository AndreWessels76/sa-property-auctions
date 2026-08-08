/**
 * Simple in-process rate limiter — per partner / connector / domain.
 * Prevents request storms within a single worker process.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function allowRate(input: {
  key: string;
  maxPerMinute: number;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  const windowMs = 60_000;
  let bucket = buckets.get(input.key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(input.key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= input.maxPerMinute) {
    return false;
  }
  bucket.timestamps.push(now);
  return true;
}

/** Test helper — clear all buckets. */
export function resetRateBuckets(): void {
  buckets.clear();
}
