/**
 * Full market performance report builder.
 */

import { publicHistoricalRows } from "@/lib/intelligence/historical/historicalAggregation";
import { buildNumericMetric } from "@/lib/intelligence/historical/historicalMetrics";
import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import type { HistoricalEventObservation, TimeWindow } from "@/lib/intelligence/historical/types";
import type { PricingObservationRow } from "@/lib/repositories/PricingObservationRepository";
import { OUTCOME_INTELLIGENCE_VERSION, DEFAULT_OUTCOME_CONFIG, type OutcomeIntelligenceConfig } from "./config";
import { classifyObservations } from "./evidence";
import { buildAuctionPerformance } from "./performance";
import { buildDataCoverage, dateRangeFromRows, formatDateRange } from "./coverage";
import { buildMonthlyTimeSeries } from "./timeseries";
import type { MarketPerformanceReport } from "./types";

export function buildMarketPerformanceReport(input: {
  observations: HistoricalEventObservation[];
  scope: string;
  window?: TimeWindow;
  premium?: boolean;
  pricingObservations?: PricingObservationRow[];
  config?: OutcomeIntelligenceConfig;
}): MarketPerformanceReport {
  const config = input.config ?? DEFAULT_OUTCOME_CONFIG;
  const historical = publicHistoricalRows(input.observations);
  const classifications = classifyObservations(historical, input.pricingObservations ?? []);
  const performance = buildAuctionPerformance(classifications);
  const coverage = buildDataCoverage(historical, classifications);
  const dateRange = dateRangeFromRows(historical);

  const sold = classifications.filter((c) => c.outcome === "SOLD");
  const saleValues = sold
    .map((c) => c.salePrice.salePrice)
    .filter(isValidPositiveAmount);
  const sufficient = saleValues.length >= config.minimumMarketSales;

  const m2Values: number[] = [];
  const haValues: number[] = [];
  for (const c of sold) {
    const price = c.salePrice.salePrice;
    if (!isValidPositiveAmount(price)) continue;
    const row = historical.find((h) => h.observationId === c.observationId);
    if (row && isValidPositiveArea(row.floorSizeM2)) m2Values.push(price / row.floorSizeM2!);
    if (row && isValidPositiveArea(row.hectares)) haValues.push(price / row.hectares!);
  }

  const salePrice = buildNumericMetric({
    definition: "Verified sale prices only",
    priceKind: "sale_price",
    values: sufficient ? saleValues : [],
    eligibleCount: sold.length,
    coverageDenominator: historical.length,
    period: input.window ?? "all",
  });
  if (!sufficient) {
    salePrice.notCalculableReason = `Insufficient data — ${saleValues.length} verified sale${saleValues.length === 1 ? "" : "s"} (${config.minimumMarketSales} required)`;
  }

  const typeMap = new Map<string, number>();
  for (const r of historical) {
    if (r.propertyType) typeMap.set(r.propertyType, (typeMap.get(r.propertyType) ?? 0) + 1);
  }

  const limitations: string[] = [
    `${historical.length} historical event${historical.length === 1 ? "" : "s"}`,
    `Outcome coverage: ${coverage.outcomeCoverage.label}`,
    `Sale-price coverage: ${coverage.salePriceCoverage.label}`,
  ];
  if (!sufficient) {
    limitations.push(
      saleValues.length === 0
        ? "No verified sale prices in scope"
        : `Market statistics require at least ${config.minimumMarketSales} verified sales`,
    );
  }

  return {
    version: OUTCOME_INTELLIGENCE_VERSION,
    scope: input.scope,
    periodLabel: formatDateRange(dateRange.from, dateRange.to),
    dateRange,
    performance,
    coverage,
    salePrice,
    medianSalePrice: { ...salePrice, definition: "Median verified sale price" },
    medianPricePerM2: buildNumericMetric({
      definition: "Median sale price per m² — floor size only",
      priceKind: "sale_price",
      values: sufficient ? m2Values : [],
      eligibleCount: m2Values.length,
      coverageDenominator: sold.length,
      period: input.window ?? "all",
    }),
    medianPricePerHa: buildNumericMetric({
      definition: "Median sale price per hectare",
      priceKind: "sale_price",
      values: sufficient ? haValues : [],
      eligibleCount: haValues.length,
      coverageDenominator: sold.length,
      period: input.window ?? "all",
    }),
    propertyTypeDistribution: [...typeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    monthlyActivity: buildMonthlyTimeSeries(classifications, config),
    limitations,
    premium: input.premium ?? true,
  };
}

export function buildPropertyHistoryChain(
  masterId: string,
  observations: HistoricalEventObservation[],
  pricingObs: PricingObservationRow[] = [],
) {
  const historical = publicHistoricalRows(observations).filter(
    (o) => o.propertyMasterId === masterId,
  );
  const classifications = classifyObservations(historical, pricingObs);
  return {
    propertyMasterId: masterId,
    events: classifications
      .sort((a, b) =>
        (a.outcomeEvidence.sourceTimestamp ?? "").localeCompare(
          b.outcomeEvidence.sourceTimestamp ?? "",
        ),
      )
      .map((c) => ({
        year: c.outcomeEvidence.sourceTimestamp
          ? new Date(c.outcomeEvidence.sourceTimestamp).getFullYear()
          : 0,
        auctionDate: c.outcomeEvidence.sourceTimestamp,
        outcome: c.outcome,
        salePrice: c.salePrice.salePrice,
        auctionEventId: c.outcomeEvidence.auctionEventId,
        sourceUrl: c.outcomeEvidence.sourceUrl,
        outcomeEvidence: c.outcomeEvidence,
      })),
  };
}
