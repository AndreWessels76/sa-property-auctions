/**
 * Deterministic pricing coverage metrics — always with numerator/denominator.
 */

import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { PricingObservationRepository } from "@/lib/repositories/PricingObservationRepository";

export type CoverageMetric = {
  label: string;
  numerator: number;
  denominator: number;
  ratio: number | null;
  dateRange: { from: string | null; to: string | null };
  sourceScope: string;
};

function ratio(n: number, d: number): number | null {
  if (d <= 0) return null;
  return Math.round((n / d) * 1000) / 1000;
}

export async function buildPricingCoverageReport(): Promise<{
  generatedAt: string;
  tableAvailable: boolean;
  metrics: CoverageMetric[];
  bySource: Array<{
    source: string;
    listings: number;
    withAuctionPrice: number;
    withGuidePrice: number;
    withFloorSize: number;
    withHectares: number;
  }>;
  openConflicts: number;
  observationCount: number;
}> {
  const generatedAt = new Date().toISOString();
  const obsMeta = await PricingObservationRepository.coverageMetrics();

  let properties: Awaited<ReturnType<typeof PropertyRepository.getAll>> = [];
  try {
    properties = await PropertyRepository.getAll();
  } catch {
    properties = [];
  }

  const denom = properties.length;
  const dates = properties
    .map((p) => p.auction_date)
    .filter(Boolean)
    .sort();
  const dateRange = {
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
  };
  const sourceScope = "all_catalogue_properties_in_db";

  const hasPos = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) && n > 0;

  const withAuction = properties.filter((p) => hasPos(p.auction_price)).length;
  const withReserve = properties.filter((p) => hasPos(p.reserve_price)).length;
  const withEstimate = properties.filter((p) => hasPos(p.estimated_value)).length;
  const withFloor = properties.filter((p) => hasPos(p.floor_size)).length;
  const withHa = properties.filter((p) => {
    const ad = p.agricultural_details as { totalHectares?: number } | null;
    return hasPos(ad?.totalHectares);
  }).length;
  const usablePriceFloor = properties.filter(
    (p) => hasPos(p.auction_price) && hasPos(p.floor_size),
  ).length;
  const usablePriceHa = properties.filter((p) => {
    const ad = p.agricultural_details as { totalHectares?: number } | null;
    return hasPos(p.auction_price) && hasPos(ad?.totalHectares);
  }).length;

  const guideFromObs = obsMeta.byField.guide_price ?? 0;

  const metrics: CoverageMetric[] = [
    {
      label: "Listings with auction price",
      numerator: withAuction,
      denominator: denom,
      ratio: ratio(withAuction, denom),
      dateRange,
      sourceScope,
    },
    {
      label: "Listings with reserve",
      numerator: withReserve,
      denominator: denom,
      ratio: ratio(withReserve, denom),
      dateRange,
      sourceScope,
    },
    {
      label: "Listings with guide price (observations)",
      numerator: guideFromObs,
      denominator: denom,
      ratio: ratio(guideFromObs, denom),
      dateRange,
      sourceScope: "pricing_observations + catalogue",
    },
    {
      label: "Listings with estimate",
      numerator: withEstimate,
      denominator: denom,
      ratio: ratio(withEstimate, denom),
      dateRange,
      sourceScope,
    },
    {
      label: "Listings with floor size",
      numerator: withFloor,
      denominator: denom,
      ratio: ratio(withFloor, denom),
      dateRange,
      sourceScope,
    },
    {
      label: "Listings with hectares",
      numerator: withHa,
      denominator: denom,
      ratio: ratio(withHa, denom),
      dateRange,
      sourceScope,
    },
    {
      label: "Listings with usable price + floor size",
      numerator: usablePriceFloor,
      denominator: denom,
      ratio: ratio(usablePriceFloor, denom),
      dateRange,
      sourceScope,
    },
    {
      label: "Listings with usable price + hectares",
      numerator: usablePriceHa,
      denominator: denom,
      ratio: ratio(usablePriceHa, denom),
      dateRange,
      sourceScope,
    },
  ];

  const bySourceMap = new Map<
    string,
    {
      source: string;
      listings: number;
      withAuctionPrice: number;
      withGuidePrice: number;
      withFloorSize: number;
      withHectares: number;
    }
  >();

  for (const p of properties) {
    const source = p.source_name || p.auction_agency || p.source || "unknown";
    const cur = bySourceMap.get(source) ?? {
      source,
      listings: 0,
      withAuctionPrice: 0,
      withGuidePrice: 0,
      withFloorSize: 0,
      withHectares: 0,
    };
    cur.listings += 1;
    if (hasPos(p.auction_price)) cur.withAuctionPrice += 1;
    if (hasPos(p.floor_size)) cur.withFloorSize += 1;
    const ad = p.agricultural_details as { totalHectares?: number } | null;
    if (hasPos(ad?.totalHectares)) cur.withHectares += 1;
    bySourceMap.set(source, cur);
  }

  return {
    generatedAt,
    tableAvailable: obsMeta.available,
    metrics,
    bySource: [...bySourceMap.values()].sort((a, b) => b.listings - a.listings),
    openConflicts: obsMeta.openConflicts,
    observationCount: obsMeta.observations,
  };
}
