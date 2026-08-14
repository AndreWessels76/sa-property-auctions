/**
 * Time-series intelligence — deterministic buckets, no fabricated trends.
 */

import { buildSaleEvidence } from "@/lib/intelligence/comparables/saleEvidence";
import { median } from "@/lib/intelligence/historical/historicalMetrics";
import { pricePerHa, pricePerM2 } from "@/lib/intelligence/comparables/priceMetrics";
import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import { II45_MINIMUM_TIMESERIES_SALES } from "./config";
import type { BuildContext, TimeSeriesBucket } from "./types";

type BucketKind = "monthly" | "quarterly" | "yearly";

function bucketKey(date: string, kind: BucketKind): string {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  if (kind === "yearly") return `${y}`;
  if (kind === "quarterly") return `${y}-Q${Math.ceil(m / 3)}`;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function buildTimeSeries(
  ctx: BuildContext,
  kind: BucketKind = "monthly",
): TimeSeriesBucket[] {
  const buckets = new Map<string, BuildContext["observations"]>();

  for (const o of ctx.observations) {
    if (!o.auctionDate) continue;
    const key = bucketKey(o.auctionDate, kind);
    const list = buckets.get(key) ?? [];
    list.push(o);
    buckets.set(key, list);
  }

  const sortedKeys = [...buckets.keys()].sort();
  const result: TimeSeriesBucket[] = [];
  let prevMedian: number | null = null;

  for (const period of sortedKeys) {
    const obs = buckets.get(period)!;
    let verifiedSoldCount = 0;
    let verifiedSalePriceCount = 0;
    const salePrices: number[] = [];
    const perM2: number[] = [];
    const perHa: number[] = [];

    for (const o of obs) {
      const sale = buildSaleEvidence(o);
      if (sale.verifiedSale) verifiedSoldCount++;
      if (sale.verifiedSale && isValidPositiveAmount(sale.salePrice)) {
        verifiedSalePriceCount++;
        salePrices.push(sale.salePrice);
        const m2 = pricePerM2(sale, o.floorSizeM2);
        if (m2.calculable && m2.value != null) perM2.push(m2.value);
        const ha = pricePerHa(sale, o.hectares, o.hectaresApproximate);
        if (ha.calculable && ha.value != null) perHa.push(ha.value);
      }
    }

    const medianSalePrice =
      salePrices.length >= II45_MINIMUM_TIMESERIES_SALES ? median(salePrices) : null;
    const medianPricePerM2 =
      perM2.length >= II45_MINIMUM_TIMESERIES_SALES ? median(perM2) : null;
    const medianPricePerHa =
      perHa.length >= II45_MINIMUM_TIMESERIES_SALES ? median(perHa) : null;

    let trendStatus: TimeSeriesBucket["trendStatus"] = "TREND_INSUFFICIENT_DATA";
    if (
      prevMedian != null &&
      medianSalePrice != null &&
      salePrices.length >= II45_MINIMUM_TIMESERIES_SALES
    ) {
      trendStatus = "TREND_AVAILABLE";
    }

    result.push({
      period,
      auctionCount: obs.length,
      verifiedSoldCount,
      verifiedSalePriceCount,
      medianSalePrice,
      medianPricePerM2,
      medianPricePerHa,
      evidenceCoverage: verifiedSalePriceCount,
      trendStatus,
    });

    if (medianSalePrice != null) prevMedian = medianSalePrice;
  }

  return result;
}
