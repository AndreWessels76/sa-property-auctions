/**
 * Historical Intelligence 2B builder — deterministic, evidence-based.
 */

import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import type {
  HistoricalEventObservation,
  HistoricalMarketCategory,
  NumericMetric,
  TimeWindow,
  CountMetric,
} from "./types";
import { HISTORICAL_INTELLIGENCE_VERSION } from "./types";
import { publicHistoricalRows } from "./historicalAggregation";
import { buildNumericMetric, TIME_WINDOW_LABELS } from "./historicalMetrics";
import { filterByWindow, trendByYear, frequencyByMonth, growthBetweenYears } from "./historicalTrends";
import { coverageSnapshot } from "./historicalCoverage";
import { comparableEligibility } from "./historicalComparables";
import { provenanceForMetric } from "./historicalProvenance";
import { hasKnownOutcome } from "./eventClassification";

export type HistoricalIntelligenceReport = {
  version: string;
  period: TimeWindow;
  periodLabel: string;
  generatedAt: string;
  activity: {
    historicalEvents: number;
    sold: number;
    completed: number;
    withdrawn: number;
    cancelled: number;
    expired: number;
    unknownOutcome: number;
    upcomingExcluded: number;
  };
  rates: {
    saleRate: CountMetric;
    withdrawnRate: CountMetric;
    cancelledRate: CountMetric;
  };
  salePrice: NumericMetric;
  auctionPrice: NumericMetric;
  salePricePerM2: NumericMetric;
  auctionPricePerM2: NumericMetric;
  salePricePerHa: NumericMetric;
  auctionPricePerHa: NumericMetric;
  byMarketCategory: Array<{
    category: HistoricalMarketCategory;
    count: number;
    salePrice: NumericMetric;
  }>;
  byPropertyType: Array<{ type: string; count: number }>;
  byAgency: Array<{
    agency: string;
    events: number;
    sold: number;
    withdrawn: number;
    cancelled: number;
    salePrice: NumericMetric;
  }>;
  byArea: Array<{
    town: string;
    province: string | null;
    events: number;
    sold: number;
    salePrice: NumericMetric;
  }>;
  agricultural: {
    events: number;
    withHectares: number;
    salePricePerHa: NumericMetric;
    subtypes: Array<{ subtype: string; count: number }>;
  };
  frequency: Array<{ periodKey: string; count: number }>;
  salePriceTrend: ReturnType<typeof trendByYear>;
  growth: ReturnType<typeof growthBetweenYears> | null;
  coverage: ReturnType<typeof coverageSnapshot>;
  comparables: {
    eligible: number;
    ineligible: number;
  };
  provenance: ReturnType<typeof provenanceForMetric>;
  insufficient: boolean;
  insufficientMessage: string | null;
};

function unitValues(
  rows: HistoricalEventObservation[],
  priceKind: "sale_price" | "auction_price",
  unit: "m2" | "ha",
): { values: number[]; approximate: boolean } {
  const values: number[] = [];
  let approximate = false;
  for (const r of rows) {
    const price = r.prices[priceKind];
    if (!isValidPositiveAmount(price)) continue;
    if (unit === "m2") {
      if (!isValidPositiveArea(r.floorSizeM2)) continue;
      values.push(price / r.floorSizeM2!);
    } else {
      if (!isValidPositiveArea(r.hectares)) continue;
      if (r.hectaresApproximate) approximate = true;
      values.push(price / r.hectares!);
    }
  }
  return { values, approximate };
}

export function buildHistoricalIntelligenceReport(input: {
  observations: HistoricalEventObservation[];
  window?: TimeWindow;
  now?: Date;
  upcomingExcluded?: number;
}): HistoricalIntelligenceReport {
  const window = input.window ?? "all";
  const now = input.now ?? new Date();
  const historical = publicHistoricalRows(input.observations);
  const { included } = filterByWindow(historical, window, now);
  const scoped = window === "all" ? historical : included;
  const dated = scoped.filter((r) => r.auctionDate != null);

  const sold = scoped.filter((r) => r.state === "sold");
  const completed = scoped.filter((r) => r.state === "completed");
  const withdrawn = scoped.filter((r) => r.state === "withdrawn");
  const cancelled = scoped.filter((r) => r.state === "cancelled");
  const expired = scoped.filter((r) => r.state === "expired");
  const unknownOutcome = scoped.filter(
    (r) => r.state === "unknown" || r.state === "completed" || r.state === "expired",
  );
  const knownOutcome = scoped.filter((r) => hasKnownOutcome(r.state));

  const saleValues = sold
    .map((r) => r.prices.sale_price)
    .filter(isValidPositiveAmount);
  const auctionValues = scoped
    .map((r) => r.prices.auction_price)
    .filter(isValidPositiveAmount);

  const salePrice = buildNumericMetric({
    definition:
      "Median of confirmed sale prices attached to verified historical Auction Events (or listing fallback) within the selected period. Guide, reserve, estimate, and auction prices are excluded.",
    priceKind: "sale_price",
    values: saleValues,
    eligibleCount: sold.length,
    coverageDenominator: dated.length,
    period: window,
  });

  const auctionPrice = buildNumericMetric({
    definition:
      "Median of explicit auction prices on verified historical events. Not a sale price.",
    priceKind: "auction_price",
    values: auctionValues,
    eligibleCount: dated.length,
    coverageDenominator: dated.length,
    period: window,
  });

  const saleM2 = unitValues(sold, "sale_price", "m2");
  const auctionM2 = unitValues(scoped, "auction_price", "m2");
  const saleHa = unitValues(
    scoped.filter((r) => r.marketCategory === "Agricultural"),
    "sale_price",
    "ha",
  );
  const auctionHa = unitValues(
    scoped.filter((r) => r.marketCategory === "Agricultural"),
    "auction_price",
    "ha",
  );

  const salePricePerM2 = buildNumericMetric({
    definition:
      "Sale price divided by verified floor size in square metres. Land size is never used.",
    priceKind: "sale_price",
    values: saleM2.values,
    eligibleCount: sold.length,
    coverageDenominator: dated.length,
    period: window,
  });
  const auctionPricePerM2 = buildNumericMetric({
    definition:
      "Auction price divided by verified floor size in square metres. Not sale price/m².",
    priceKind: "auction_price",
    values: auctionM2.values,
    eligibleCount: dated.length,
    coverageDenominator: dated.length,
    period: window,
  });
  const salePricePerHa = buildNumericMetric({
    definition:
      "Sale price divided by normalised agricultural hectares. Approximate hectares remain approximate.",
    priceKind: "sale_price",
    values: saleHa.values,
    eligibleCount: dated.filter((r) => r.marketCategory === "Agricultural").length,
    coverageDenominator: dated.filter((r) => r.marketCategory === "Agricultural").length,
    period: window,
    isApproximate: saleHa.approximate,
  });
  const auctionPricePerHa = buildNumericMetric({
    definition:
      "Auction price divided by normalised agricultural hectares. Approximate hectares remain approximate.",
    priceKind: "auction_price",
    values: auctionHa.values,
    eligibleCount: dated.filter((r) => r.marketCategory === "Agricultural").length,
    coverageDenominator: dated.filter((r) => r.marketCategory === "Agricultural").length,
    period: window,
    isApproximate: auctionHa.approximate,
  });

  const knownDenom = knownOutcome.length;
  const saleRate: CountMetric = {
    label: "Sale rate",
    count: sold.length,
    denominator: knownDenom,
    definition:
      "Confirmed sold events divided by completed events with known outcomes (sold + withdrawn + cancelled). Unknown outcomes are excluded from the denominator.",
  };
  const withdrawnRate: CountMetric = {
    label: "Withdrawn rate",
    count: withdrawn.length,
    denominator: knownDenom,
    definition:
      "Withdrawn events divided by events with known outcomes. Unknown is not treated as withdrawn.",
  };
  const cancelledRate: CountMetric = {
    label: "Cancelled rate",
    count: cancelled.length,
    denominator: knownDenom,
    definition:
      "Cancelled events divided by events with known outcomes.",
  };

  const categories: HistoricalMarketCategory[] = [
    "Residential",
    "Commercial",
    "Industrial",
    "Agricultural",
    "Vacant Land",
  ];
  const byMarketCategory = categories.map((category) => {
    const group = dated.filter((r) => r.marketCategory === category);
    const values = group
      .filter((r) => r.state === "sold")
      .map((r) => r.prices.sale_price)
      .filter(isValidPositiveAmount);
    return {
      category,
      count: group.length,
      salePrice: buildNumericMetric({
        definition: `Confirmed sale prices for ${category} only — never mixed with other categories.`,
        priceKind: "sale_price",
        values,
        eligibleCount: group.filter((r) => r.state === "sold").length,
        coverageDenominator: group.length,
        period: window,
      }),
    };
  });

  const typeMap = new Map<string, number>();
  for (const r of dated) {
    if (r.propertyTypeStatus !== "known" || !r.propertyType) continue;
    typeMap.set(r.propertyType, (typeMap.get(r.propertyType) ?? 0) + 1);
  }
  const byPropertyType = [...typeMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const agencyMap = new Map<string, HistoricalEventObservation[]>();
  for (const r of dated) {
    const key = r.agency?.trim() || r.sourceName?.trim();
    if (!key) continue;
    const arr = agencyMap.get(key) ?? [];
    arr.push(r);
    agencyMap.set(key, arr);
  }
  const byAgency = [...agencyMap.entries()]
    .map(([agency, group]) => ({
      agency,
      events: group.length,
      sold: group.filter((r) => r.state === "sold").length,
      withdrawn: group.filter((r) => r.state === "withdrawn").length,
      cancelled: group.filter((r) => r.state === "cancelled").length,
      salePrice: buildNumericMetric({
        definition: `Confirmed sale prices for agency ${agency}. Not a ranking.`,
        priceKind: "sale_price",
        values: group
          .filter((r) => r.state === "sold")
          .map((r) => r.prices.sale_price)
          .filter(isValidPositiveAmount),
        eligibleCount: group.filter((r) => r.state === "sold").length,
        coverageDenominator: group.length,
        period: window,
      }),
    }))
    .sort((a, b) => b.events - a.events);

  const areaMap = new Map<string, HistoricalEventObservation[]>();
  for (const r of dated) {
    if (!r.town?.trim()) continue;
    const arr = areaMap.get(r.town) ?? [];
    arr.push(r);
    areaMap.set(r.town, arr);
  }
  const byArea = [...areaMap.entries()]
    .map(([town, group]) => ({
      town,
      province: group[0]?.province ?? null,
      events: group.length,
      sold: group.filter((r) => r.state === "sold").length,
      salePrice: buildNumericMetric({
        definition: `Confirmed sale prices in ${town}.`,
        priceKind: "sale_price",
        values: group
          .filter((r) => r.state === "sold")
          .map((r) => r.prices.sale_price)
          .filter(isValidPositiveAmount),
        eligibleCount: group.filter((r) => r.state === "sold").length,
        coverageDenominator: group.length,
        period: window,
      }),
    }))
    .sort((a, b) => b.events - a.events);

  const agri = dated.filter((r) => r.marketCategory === "Agricultural");
  const subtypeMap = new Map<string, number>();
  for (const r of agri) {
    if (!r.agriculturalSubtype) continue;
    subtypeMap.set(
      r.agriculturalSubtype,
      (subtypeMap.get(r.agriculturalSubtype) ?? 0) + 1,
    );
  }

  const saleTrend = trendByYear(dated.filter((r) => r.state === "sold"), "sale_price");
  let growth = null;
  if (saleTrend.length >= 2) {
    const from = saleTrend[saleTrend.length - 2]!;
    const to = saleTrend[saleTrend.length - 1]!;
    growth = growthBetweenYears(saleTrend, from.periodKey, to.periodKey);
  }

  const comps = dated.map((r) => comparableEligibility(r, "sale_price"));
  const insufficient = dated.length === 0;
  const insufficientMessage = insufficient
    ? "Insufficient historical data"
    : dated.length < 5
      ? `We currently have ${dated.length} verified historical event${dated.length === 1 ? "" : "s"}. More observations are required before a reliable historical trend can be displayed.`
      : null;

  return {
    version: HISTORICAL_INTELLIGENCE_VERSION,
    period: window,
    periodLabel: TIME_WINDOW_LABELS[window],
    generatedAt: now.toISOString(),
    activity: {
      historicalEvents: scoped.length,
      sold: sold.length,
      completed: completed.length,
      withdrawn: withdrawn.length,
      cancelled: cancelled.length,
      expired: expired.length,
      unknownOutcome: unknownOutcome.length,
      upcomingExcluded: input.upcomingExcluded ?? 0,
    },
    rates: { saleRate, withdrawnRate, cancelledRate },
    salePrice,
    auctionPrice,
    salePricePerM2,
    auctionPricePerM2,
    salePricePerHa,
    auctionPricePerHa,
    byMarketCategory,
    byPropertyType,
    byAgency,
    byArea,
    agricultural: {
      events: agri.length,
      withHectares: agri.filter((r) => isValidPositiveArea(r.hectares)).length,
      salePricePerHa,
      subtypes: [...subtypeMap.entries()].map(([subtype, count]) => ({
        subtype,
        count,
      })),
    },
    frequency: frequencyByMonth(dated),
    salePriceTrend: saleTrend,
    growth,
    coverage: coverageSnapshot(dated),
    comparables: {
      eligible: comps.filter((c) => c.eligible).length,
      ineligible: comps.filter((c) => !c.eligible).length,
    },
    provenance: provenanceForMetric(salePrice, sold),
    insufficient,
    insufficientMessage,
  };
}

export function buildPropertyHistoricalSummary(
  observations: HistoricalEventObservation[],
): {
  historicalEvents: number;
  confirmedSales: number;
  withdrawn: number;
  cancelled: number;
  expired: number;
  outcomeNotSupplied: number;
  timeline: Array<{
    observationId: string;
    auctionEventId: string | null;
    auctionDate: string | null;
    state: string;
    salePrice: number | null;
    auctionPrice: number | null;
    sourceName: string | null;
    sourceUnit: string;
  }>;
  insufficientMessage: string | null;
} {
  const historical = publicHistoricalRows(observations);
  const outcomeNotSupplied = historical.filter(
    (r) => r.state === "completed" || r.state === "unknown" || r.state === "expired",
  ).length;
  const timeline = [...historical]
    .sort((a, b) => (a.auctionDate ?? "").localeCompare(b.auctionDate ?? ""))
    .map((r) => ({
      observationId: r.observationId,
      auctionEventId: r.auctionEventId,
      auctionDate: r.auctionDate,
      state: r.state,
      salePrice: r.prices.sale_price,
      auctionPrice: r.prices.auction_price,
      sourceName: r.sourceName,
      sourceUnit: r.sourceUnit,
    }));
  return {
    historicalEvents: historical.length,
    confirmedSales: historical.filter((r) => r.state === "sold").length,
    withdrawn: historical.filter((r) => r.state === "withdrawn").length,
    cancelled: historical.filter((r) => r.state === "cancelled").length,
    expired: historical.filter((r) => r.state === "expired").length,
    outcomeNotSupplied,
    timeline,
    insufficientMessage:
      historical.length === 0
        ? "Insufficient historical data — no verified historical Auction Events for this property."
        : null,
  };
}
