import { NextResponse } from "next/server";

type RateLimitOptions = {
  /** Unique bucket key, e.g. `ai:userId` or IP */
  key: string;
  /** Max requests in the window */
  limit: number;
  /** Window length in milliseconds */
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 500) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * In-memory rate limiter suitable for single-instance deployments.
 * Returns a 429 response when exceeded, otherwise null.
 */
export function rateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  prune(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  existing.count += 1;

  if (existing.count > limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    );

    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  return null;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
