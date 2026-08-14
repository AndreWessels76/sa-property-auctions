/**
 * Deterministic descriptive statistics. Never zero-fills missing values.
 */

import {
  isValidPositiveAmount,
  roundPercent,
} from "@/lib/intelligence/pricing/priceCalculations";
import type {
  NumericMetric,
  SampleSafety,
  TimeWindow,
  HistoricalPriceKind,
} from "./types";

export function sampleSafety(count: number): SampleSafety {
  if (count <= 0) return "insufficient_data";
  if (count === 1) return "limited_one";
  if (count < 5) return "limited_sample";
  return "statistic";
}

export function sampleSafetyLabel(count: number): string {
  const s = sampleSafety(count);
  if (s === "insufficient_data") return "Insufficient data";
  if (s === "limited_one") return "Limited data — 1 record";
  if (s === "limited_sample") return "Limited historical sample";
  return `Based on ${count} confirmed observations`;
}

export function median(values: number[]): number | null {
  const usable = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (usable.length === 0) return null;
  const mid = Math.floor(usable.length / 2);
  if (usable.length % 2 === 0) {
    return (usable[mid - 1]! + usable[mid]!) / 2;
  }
  return usable[mid]!;
}

export function average(values: number[]): number | null {
  const usable = values.filter((n) => Number.isFinite(n));
  if (usable.length === 0) return null;
  return usable.reduce((s, n) => s + n, 0) / usable.length;
}

export function minMax(values: number[]): { min: number | null; max: number | null } {
  const usable = values.filter((n) => Number.isFinite(n));
  if (usable.length === 0) return { min: null, max: null };
  return { min: Math.min(...usable), max: Math.max(...usable) };
}

export function buildNumericMetric(input: {
  definition: string;
  priceKind: HistoricalPriceKind | null;
  values: number[];
  eligibleCount: number;
  coverageDenominator: number;
  period: TimeWindow;
  isApproximate?: boolean;
}): NumericMetric {
  const values = input.values.filter(isValidPositiveAmount);
  const { min, max } = minMax(values);
  const count = values.length;
  const safety = sampleSafety(count);
  return {
    definition: input.definition,
    priceKind: input.priceKind,
    count,
    eligibleCount: input.eligibleCount,
    coverageNumerator: count,
    coverageDenominator: input.coverageDenominator,
    coverageLabel: `${count} / ${input.coverageDenominator}`,
    average: count === 0 ? null : average(values),
    median: count === 0 ? null : median(values),
    min,
    max,
    sampleSafety: safety,
    sampleSafetyLabel: sampleSafetyLabel(count),
    isApproximate: Boolean(input.isApproximate),
    period: input.period,
    notCalculableReason:
      count === 0 ? "Insufficient data" : null,
  };
}

export function growthPercent(oldValue: number, newValue: number): number | null {
  if (!isValidPositiveAmount(oldValue) || !Number.isFinite(newValue)) {
    return null;
  }
  return roundPercent(((newValue - oldValue) / oldValue) * 100);
}

export function parseTimeWindowMs(window: TimeWindow, now: Date): number | null {
  if (window === "all") return null;
  const day = 24 * 60 * 60 * 1000;
  if (window === "30d") return 30 * day;
  if (window === "90d") return 90 * day;
  if (window === "6m") return 182 * day;
  if (window === "12m") return 365 * day;
  if (window === "24m") return 730 * day;
  if (window === "36m") return 1095 * day;
  return null;
}

export function inTimeWindow(
  isoDate: string | null,
  window: TimeWindow,
  now: Date,
): boolean {
  if (!isoDate) return false;
  const t = new Date(isoDate).getTime();
  if (!Number.isFinite(t)) return false;
  const span = parseTimeWindowMs(window, now);
  if (span == null) return true;
  return t >= now.getTime() - span && t <= now.getTime();
}

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  "30d": "30 days",
  "90d": "90 days",
  "6m": "6 months",
  "12m": "12 months",
  "24m": "24 months",
  "36m": "36 months",
  all: "all available history",
};
