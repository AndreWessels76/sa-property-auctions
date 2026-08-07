/**
 * Media Intelligence — validate / dedupe / history helpers around existing image pipeline.
 * Does not fabricate galleries.
 */

export type MediaAssetRecord = {
  url: string;
  contentHash?: string | null;
  bytes?: number | null;
  width?: number | null;
  height?: number | null;
  isPrimary?: boolean;
};

export type MediaIntelligenceResult = {
  accepted: string[];
  rejected: Array<{ url: string; reason: string }>;
  duplicatesRemoved: number;
  primaryUrl: string | null;
};

export function validateMediaUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function dedupeMediaUrls(urls: string[]): {
  unique: string[];
  duplicatesRemoved: number;
} {
  const seen = new Set<string>();
  const unique: string[] = [];
  let duplicatesRemoved = 0;
  for (const raw of urls) {
    const url = raw.trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(key);
    unique.push(url);
  }
  return { unique, duplicatesRemoved };
}

export function buildMediaIntelligence(
  urls: string[],
  options?: { maxImages?: number },
): MediaIntelligenceResult {
  const max = options?.maxImages ?? 20;
  const rejected: Array<{ url: string; reason: string }> = [];
  const valid: string[] = [];
  for (const url of urls) {
    if (!validateMediaUrl(url)) {
      rejected.push({ url, reason: "Invalid URL scheme" });
      continue;
    }
    valid.push(url.trim());
  }
  const { unique, duplicatesRemoved } = dedupeMediaUrls(valid);
  const accepted = unique.slice(0, max);
  if (unique.length > max) {
    for (const url of unique.slice(max)) {
      rejected.push({ url, reason: `Exceeds max gallery size (${max})` });
    }
  }
  return {
    accepted,
    rejected,
    duplicatesRemoved,
    primaryUrl: accepted[0] ?? null,
  };
}
