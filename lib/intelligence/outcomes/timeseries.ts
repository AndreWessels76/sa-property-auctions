/**
 * Deterministic time-series — no forecasting.
 */

import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import { median, sampleSafetyLabel } from "@/lib/intelligence/historical/historicalMetrics";
import type { OutcomeClassification } from "./types";
import type { TimeSeriesPoint } from "./types";
import type { OutcomeIntelligenceConfig } from "./config";
import { DEFAULT_OUTCOME_CONFIG } from "./config";

export function buildMonthlyTimeSeries(
  classifications: OutcomeClassification[],
  config: OutcomeIntelligenceConfig = DEFAULT_OUTCOME_CONFIG,
): TimeSeriesPoint[] {
  const buckets = new Map<
    string,
    {
      all: OutcomeClassification[];
      sold: OutcomeClassification[];
    }
  >();

  for (const c of classifications) {
    const date = c.outcomeEvidence.sourceTimestamp;
    if (!date) continue;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key) ?? { all: [], sold: [] };
    bucket.all.push(c);
    if (c.outcome === "SOLD") bucket.sold.push(c);
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, bucket]) => {
      const salePrices = bucket.sold
        .map((c) => c.salePrice.salePrice)
        .filter(isValidPositiveAmount);
      const m2Values: number[] = [];
      const haValues: number[] = [];
      for (const c of bucket.sold) {
        const price = c.salePrice.salePrice;
        if (!isValidPositiveAmount(price)) continue;
        // floor/ha from linked observation — use sale price evidence only path
      }

      const confirmed = bucket.all.filter(
        (c) => c.outcome === "SOLD" || c.outcome === "WITHDRAWN" || c.outcome === "CANCELLED",
      ).length;
      const soldCount = bucket.sold.length;
      const saleRate =
        confirmed > 0 ? Math.round((soldCount / confirmed) * 1000) / 10 : null;

      const sufficient = salePrices.length >= config.minimumTimeSeriesSales;

      return {
        periodKey,
        periodLabel: periodKey,
        auctionVolume: bucket.all.length,
        confirmedSales: soldCount,
        saleRate,
        medianSalePrice: sufficient ? median(salePrices) : null,
        medianPricePerM2: m2Values.length ? median(m2Values) : null,
        medianPricePerHa: haValues.length ? median(haValues) : null,
        sampleSafety: sampleSafetyLabel(salePrices.length),
        calculable: sufficient,
      };
    });
}

export function buildQuarterlyTimeSeries(
  monthly: TimeSeriesPoint[],
): TimeSeriesPoint[] {
  const buckets = new Map<string, TimeSeriesPoint[]>();
  for (const m of monthly) {
    const [y, mo] = m.periodKey.split("-");
    const q = Math.ceil(Number(mo) / 3);
    const key = `${y}-Q${q}`;
    const arr = buckets.get(key) ?? [];
    arr.push(m);
    buckets.set(key, arr);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, points]) => ({
      periodKey,
      periodLabel: periodKey,
      auctionVolume: points.reduce((s, p) => s + p.auctionVolume, 0),
      confirmedSales: points.reduce((s, p) => s + p.confirmedSales, 0),
      saleRate: null,
      medianSalePrice: median(
        points.map((p) => p.medianSalePrice).filter(isValidPositiveAmount) as number[],
      ),
      medianPricePerM2: null,
      medianPricePerHa: null,
      sampleSafety: sampleSafetyLabel(points.reduce((s, p) => s + p.confirmedSales, 0)),
      calculable: points.some((p) => p.calculable),
    }));
}
