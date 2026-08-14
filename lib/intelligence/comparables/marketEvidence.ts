/**
 * Area and agency market evidence with sample size rules.
 */

import { publicHistoricalRows } from "@/lib/intelligence/historical/historicalAggregation";
import {
  buildNumericMetric,
  median,
  average,
  minMax,
} from "@/lib/intelligence/historical/historicalMetrics";
import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import { isCurrentCatalogueState } from "@/lib/intelligence/historical/eventClassification";
import { growthBetweenYears, trendByYear } from "@/lib/intelligence/historical/historicalTrends";
import type { HistoricalEventObservation, TimeWindow } from "@/lib/intelligence/historical/types";
import {
  COMPARABLE_INTELLIGENCE_VERSION,
  DEFAULT_COMPARABLE_CONFIG,
  type ComparableIntelligenceConfig,
} from "./config";
import type { MarketEvidenceResult } from "./types";

function unitValues(
  rows: HistoricalEventObservation[],
  unit: "m2" | "ha",
): number[] {
  const values: number[] = [];
  for (const r of rows) {
    const price = r.prices.sale_price;
    if (!isValidPositiveAmount(price)) continue;
    if (unit === "m2") {
      if (!isValidPositiveArea(r.floorSizeM2)) continue;
      values.push(price / r.floorSizeM2!);
    } else {
      if (!isValidPositiveArea(r.hectares)) continue;
      values.push(price / r.hectares!);
    }
  }
  return values;
}

export function buildMarketEvidence(input: {
  observations: HistoricalEventObservation[];
  scope: "area" | "agency" | "market";
  scopeLabel: string;
  window?: TimeWindow;
  premium?: boolean;
  config?: ComparableIntelligenceConfig;
}): MarketEvidenceResult {
  const config = input.config ?? DEFAULT_COMPARABLE_CONFIG;
  const window = input.window ?? "all";
  const all = input.observations;
  const historical = publicHistoricalRows(all);
  const sold = historical.filter((r) => r.state === "sold");
  const saleValues = sold
    .map((r) => r.prices.sale_price)
    .filter(isValidPositiveAmount);
  const m2Values = unitValues(sold, "m2");
  const haValues = unitValues(
    sold.filter((r) => r.marketCategory === "Agricultural"),
    "ha",
  );

  const minMarket = config.minimumMarketSales;
  const sufficientSales = saleValues.length >= minMarket;

  const salePrice = buildNumericMetric({
    definition: "Verified sale prices only — auction/guide/reserve/estimate excluded",
    priceKind: "sale_price",
    values: sufficientSales ? saleValues : [],
    eligibleCount: sold.length,
    coverageDenominator: historical.length,
    period: window,
  });

  const formatInsufficient = (count: number) =>
    sufficientSales
      ? null
      : `Insufficient data — ${count} verified sale${count === 1 ? "" : "s"} (minimum ${minMarket} required)`;

  if (!sufficientSales) {
    salePrice.notCalculableReason = formatInsufficient(saleValues.length);
    salePrice.sampleSafetyLabel =
      saleValues.length > 0
        ? `${saleValues.length} verified sale${saleValues.length === 1 ? "" : "s"} — below market minimum (${minMarket})`
        : "Insufficient data";
    salePrice.median = null;
    salePrice.average = null;
    salePrice.min = null;
    salePrice.max = null;
  } else if (saleValues.length > 0) {
    salePrice.notCalculableReason = null;
  }

  const { min, max } = sufficientSales ? minMax(saleValues) : { min: null, max: null };
  const medianVal = sufficientSales && saleValues.length ? median(saleValues) : null;
  const averageVal = sufficientSales && saleValues.length ? average(saleValues) : null;
  const m2ForStats = sufficientSales ? m2Values : [];
  const haForStats = sufficientSales ? haValues : [];

  const saleTrend = trendByYear(sold, "sale_price");
  let growthNarrative = "Insufficient historical sales data";
  let growthCalculable = false;
  if (saleTrend.length >= 2) {
    const from = saleTrend[saleTrend.length - 2]!;
    const to = saleTrend[saleTrend.length - 1]!;
    const growth = growthBetweenYears(saleTrend, from.periodKey, to.periodKey);
    if (growth.calculable && from.count >= minMarket && to.count >= minMarket) {
      growthCalculable = true;
      growthNarrative = growth.narrative;
    }
  }

  return {
    version: COMPARABLE_INTELLIGENCE_VERSION,
    scope: input.scope,
    scopeLabel: input.scopeLabel,
    activity: {
      historicalAuctions: historical.length,
      verifiedSales: sold.length,
      withdrawn: historical.filter((r) => r.state === "withdrawn").length,
      cancelled: historical.filter((r) => r.state === "cancelled").length,
      expired: historical.filter((r) => r.state === "expired").length,
      upcoming: all.filter((r) => r.state === "upcoming").length,
      live: all.filter((r) => r.state === "live").length,
    },
    salePrice,
    medianSalePrice: {
      ...salePrice,
      definition: "Median verified sale price",
      median: medianVal,
    },
    averageSalePrice: {
      ...salePrice,
      definition: "Average verified sale price",
      average: averageVal,
    },
    minSalePrice: {
      ...salePrice,
      definition: "Minimum verified sale price",
      min,
      max: null,
      median: null,
      average: null,
    },
    maxSalePrice: {
      ...salePrice,
      definition: "Maximum verified sale price",
      min: null,
      max,
      median: null,
      average: null,
    },
    averagePricePerM2: buildNumericMetric({
      definition: "Average sale price per m² — floor size only",
      priceKind: "sale_price",
      values: m2ForStats,
      eligibleCount: m2ForStats.length,
      coverageDenominator: sold.length,
      period: window,
    }),
    medianPricePerM2: buildNumericMetric({
      definition: "Median sale price per m² — floor size only",
      priceKind: "sale_price",
      values: m2ForStats,
      eligibleCount: m2ForStats.length,
      coverageDenominator: sold.length,
      period: window,
    }),
    averagePricePerHa: buildNumericMetric({
      definition: "Average sale price per hectare — verified hectares only",
      priceKind: "sale_price",
      values: haForStats,
      eligibleCount: haForStats.length,
      coverageDenominator: sold.filter((r) => r.marketCategory === "Agricultural").length,
      period: window,
    }),
    medianPricePerHa: buildNumericMetric({
      definition: "Median sale price per hectare — verified hectares only",
      priceKind: "sale_price",
      values: haForStats,
      eligibleCount: haForStats.length,
      coverageDenominator: sold.filter((r) => r.marketCategory === "Agricultural").length,
      period: window,
    }),
    growth: {
      calculable: growthCalculable,
      narrative: growthNarrative,
    },
    sampleSize: saleValues.length,
    limitations: [
      saleValues.length === 0
        ? "No verified sale prices in scope"
        : `${saleValues.length} verified sale${saleValues.length === 1 ? "" : "s"} in scope`,
      !sufficientSales
        ? `Market statistics require at least ${minMarket} verified sales`
        : "Sample meets minimum market threshold",
      "Auction activity is reported separately from verified sale statistics",
    ],
    premium: input.premium ?? true,
  };
}

export function filterByTown(
  observations: HistoricalEventObservation[],
  town: string,
): HistoricalEventObservation[] {
  const needle = town.trim().toLowerCase();
  return observations.filter((o) => o.town?.trim().toLowerCase() === needle);
}

export function filterByAgency(
  observations: HistoricalEventObservation[],
  agency: string,
): HistoricalEventObservation[] {
  const needle = agency.trim().toLowerCase();
  return observations.filter((o) => {
    const a = (o.agency ?? o.sourceName ?? "").trim().toLowerCase();
    return a === needle;
  });
}

export function auctionActivityOnly(observations: HistoricalEventObservation[]) {
  const historical = publicHistoricalRows(observations);
  return {
    total: historical.length,
    byState: {
      sold: historical.filter((r) => r.state === "sold").length,
      expired: historical.filter((r) => r.state === "expired").length,
      withdrawn: historical.filter((r) => r.state === "withdrawn").length,
      cancelled: historical.filter((r) => r.state === "cancelled").length,
      completed: historical.filter((r) => r.state === "completed").length,
      unknown: historical.filter((r) => r.state === "unknown").length,
    },
    catalogue: {
      upcoming: observations.filter((r) => r.state === "upcoming").length,
      live: observations.filter((r) => r.state === "live").length,
      excludedFromPublicHistorical: observations.filter((r) =>
        isCurrentCatalogueState(r.state),
      ).length,
    },
  };
}
