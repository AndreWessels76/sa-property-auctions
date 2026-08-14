/**
 * Time-bucketed trends and growth. Neutral wording only.
 */

import { isValidPositiveAmount, roundPercent } from "@/lib/intelligence/pricing/priceCalculations";
import type { HistoricalEventObservation, HistoricalPriceKind, TimeWindow, TrendPoint, GrowthResult } from "./types";
import { inTimeWindow, median, average, sampleSafety } from "./historicalMetrics";
import { TIME_WINDOW_LABELS } from "./historicalMetrics";

export function filterByWindow(
  rows: HistoricalEventObservation[],
  window: TimeWindow,
  now: Date,
): { included: HistoricalEventObservation[]; missingDate: number } {
  if (window === "all") {
    return {
      included: rows.filter((r) => r.auctionDate != null),
      missingDate: rows.filter((r) => r.auctionDate == null).length,
    };
  }
  const included: HistoricalEventObservation[] = [];
  let missingDate = 0;
  for (const r of rows) {
    if (!r.auctionDate) {
      missingDate += 1;
      continue;
    }
    if (inTimeWindow(r.auctionDate, window, now)) included.push(r);
  }
  return { included, missingDate };
}

function priceOf(
  row: HistoricalEventObservation,
  kind: HistoricalPriceKind,
): number | null {
  const v = row.prices[kind];
  return isValidPositiveAmount(v) ? v : null;
}

export function trendByYear(
  rows: HistoricalEventObservation[],
  kind: HistoricalPriceKind,
): TrendPoint[] {
  const buckets = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.auctionDate) continue;
    const y = new Date(r.auctionDate).getFullYear();
    if (!Number.isFinite(y)) continue;
    const p = priceOf(r, kind);
    const key = String(y);
    const arr = buckets.get(key) ?? [];
    if (p != null) arr.push(p);
    buckets.set(key, arr);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({
      periodKey: key,
      periodLabel: key,
      count: values.length,
      median: median(values),
      average: average(values),
      sampleSafety: sampleSafety(values.length),
    }));
}

export function frequencyByMonth(
  rows: HistoricalEventObservation[],
): Array<{ periodKey: string; count: number }> {
  const buckets = new Map<string, number>();
  for (const r of rows) {
    if (!r.auctionDate) continue;
    const d = new Date(r.auctionDate);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, count]) => ({ periodKey, count }));
}

export function growthBetweenYears(
  points: TrendPoint[],
  fromYear: string,
  toYear: string,
): GrowthResult {
  const from = points.find((p) => p.periodKey === fromYear);
  const to = points.find((p) => p.periodKey === toYear);
  const fromMedian = from?.median ?? null;
  const toMedian = to?.median ?? null;
  if (
    fromMedian == null ||
    toMedian == null ||
    !isValidPositiveAmount(fromMedian)
  ) {
    return {
      fromPeriod: fromYear,
      toPeriod: toYear,
      fromMedian,
      toMedian,
      percentage: null,
      narrative: "Not calculable",
      calculable: false,
    };
  }
  const pct = roundPercent(((toMedian - fromMedian) / fromMedian) * 100);
  const fromCount = from?.count ?? 0;
  const toCount = to?.count ?? 0;
  return {
    fromPeriod: fromYear,
    toPeriod: toYear,
    fromMedian,
    toMedian,
    percentage: pct,
    narrative: `Historical median ${fromYear} vs ${toYear} changed ${pct}% based on ${fromCount + toCount} priced observations.`,
    calculable: true,
  };
}

export { TIME_WINDOW_LABELS };
