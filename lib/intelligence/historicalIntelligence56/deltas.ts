import { HI56_DEFAULT_BATCH_LIMIT } from "./config";
import type { Hi56EvidenceDelta, Hi56FunnelStep } from "./types";

export function clampHi56BatchLimit(limit?: number): number {
  const n = limit ?? HI56_DEFAULT_BATCH_LIMIT;
  return Math.min(Math.max(n, 1), HI56_DEFAULT_BATCH_LIMIT);
}

export function rejectHi56UnlimitedLimit(limit: number | undefined): {
  ok: boolean;
  limit: number;
  error?: string;
} {
  if (limit == null) return { ok: true, limit: HI56_DEFAULT_BATCH_LIMIT };
  if (!Number.isFinite(limit) || limit < 1) {
    return { ok: false, limit: HI56_DEFAULT_BATCH_LIMIT, error: "limit must be >= 1" };
  }
  if (limit > HI56_DEFAULT_BATCH_LIMIT) {
    return {
      ok: false,
      limit: HI56_DEFAULT_BATCH_LIMIT,
      error: `limit > ${HI56_DEFAULT_BATCH_LIMIT} rejected`,
    };
  }
  return { ok: true, limit: Math.floor(limit) };
}

function rate(numerator: number, denominator: number): number | "INSUFFICIENT_DATA" {
  if (denominator <= 0) return "INSUFFICIENT_DATA";
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function buildEvidenceFunnel56(input: {
  licensedSources: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  verifiedSold: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
}): Hi56FunnelStep[] {
  return [
    {
      key: "licensedSources",
      label: "Licensed Sources",
      value: input.licensedSources,
      rate: rate(input.licensedSources, input.licensedSources),
    },
    {
      key: "fetchAttempted",
      label: "Fetch Attempted",
      value: input.fetchAttempted,
      rate: rate(input.fetchAttempted, input.licensedSources),
    },
    {
      key: "fetchSuccessful",
      label: "Fetch Successful",
      value: input.fetchSuccessful,
      rate: rate(input.fetchSuccessful, input.fetchAttempted),
    },
    {
      key: "snapshots",
      label: "Snapshots",
      value: input.snapshots,
      rate: rate(input.snapshots, input.fetchSuccessful),
    },
    {
      key: "extractions",
      label: "Extractions",
      value: input.extractions,
      rate: rate(input.extractions, input.snapshots || input.fetchSuccessful),
    },
    {
      key: "outcomeEvidence",
      label: "Outcome Evidence",
      value: input.outcomeEvidence,
      rate: rate(input.outcomeEvidence, input.extractions),
    },
    {
      key: "verifiedSold",
      label: "Verified SOLD",
      value: input.verifiedSold,
      rate: rate(input.verifiedSold, input.outcomeEvidence),
    },
    {
      key: "verifiedSalePrices",
      label: "Verified Sale Price",
      value: input.verifiedSalePrices,
      rate: rate(input.verifiedSalePrices, input.verifiedSold || input.outcomeEvidence),
    },
    {
      key: "comparableReady",
      label: "Comparable Ready",
      value: input.comparableReady,
      rate: rate(input.comparableReady, input.verifiedSalePrices),
    },
    {
      key: "marketReadyTowns",
      label: "Market Ready",
      value: input.marketReadyTowns,
      rate: rate(input.marketReadyTowns, Math.max(1, input.marketReadyTowns)),
    },
  ];
}

type MetricBag = {
  neverAttempted: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  verifiedSold: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
  catalogueLeaks: number;
};

const GAIN_KEYS: Array<keyof MetricBag> = [
  "fetchSuccessful",
  "snapshots",
  "extractions",
  "outcomeEvidence",
  "verifiedSold",
  "verifiedSalePrices",
  "comparableReady",
  "marketReadyTowns",
];

/** Honest before/after — never invent gains. */
export function buildEvidenceDelta56(input: {
  before: MetricBag;
  after: MetricBag;
  candidates?: number;
}): Hi56EvidenceDelta {
  const keys: Array<keyof MetricBag> = [
    "neverAttempted",
    "fetchAttempted",
    "fetchSuccessful",
    "fetchFailed",
    "snapshots",
    "extractions",
    "outcomeEvidence",
    "verifiedSold",
    "verifiedSalePrices",
    "comparableReady",
    "marketReadyTowns",
    "catalogueLeaks",
  ];

  const lines: string[] = [];
  if (input.candidates != null) {
    lines.push(`Candidates: ${input.candidates}`);
  }

  for (const key of keys) {
    const before = input.before[key];
    const after = input.after[key];
    const delta = after - before;
    const sign = delta > 0 ? "+" : "";
    lines.push(`${key}: ${before} → ${after} (${sign}${delta})`);
  }

  const evidenceGain = GAIN_KEYS.some((k) => input.after[k] > input.before[k]);
  const improved = evidenceGain || input.after.neverAttempted < input.before.neverAttempted;

  return {
    improved,
    evidenceGain,
    noEvidenceGain: !evidenceGain,
    message: evidenceGain
      ? "Evidence metrics improved"
      : "NO EVIDENCE GAIN — acquisition/retry produced no new snapshots, extractions, outcomes, or verified prices",
    lines,
    before: { ...input.before },
    after: { ...input.after },
  };
}

export function metricBagFromCoverage(input: {
  neverAttempted: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  verifiedSold: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
  catalogueLeaks: number;
}): MetricBag {
  return { ...input };
}
