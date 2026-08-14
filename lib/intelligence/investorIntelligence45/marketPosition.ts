/**
 * Property market position — verified evidence only.
 */

import { median } from "@/lib/intelligence/historical/historicalMetrics";
import { buildSaleEvidence } from "@/lib/intelligence/comparables/saleEvidence";
import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import { II45_MINIMUM_COMPARABLE_SALES, II45_MINIMUM_MARKET_SALES } from "./config";
import { filterVerifiedSaleObservations } from "./marketEvidence";
import type { BuildContext, MarketPosition } from "./types";

export function buildMarketPosition(
  ctx: BuildContext,
  comparablePrices: number[] = [],
): MarketPosition {
  const salePrices = filterVerifiedSaleObservations(ctx)
    .map((o) => buildSaleEvidence(o).salePrice)
    .filter((p): p is number => isValidPositiveAmount(p));

  const actualSample = salePrices.length;
  const requiredSample = II45_MINIMUM_MARKET_SALES;
  const missingCategories: string[] = [];

  if (actualSample < requiredSample) {
    missingCategories.push(`${requiredSample - actualSample} verified sale-price observations`);
  }

  const subject = ctx.observations[0];
  const subjectSale = subject ? buildSaleEvidence(subject) : null;
  const verifiedSalePrice =
    subjectSale?.verifiedSale && isValidPositiveAmount(subjectSale.salePrice)
      ? subjectSale.salePrice
      : null;

  let pricePerM2: MarketPosition["pricePerM2"] = {
    value: null,
    calculable: false,
    reason: "INSUFFICIENT_DATA",
  };
  if (
    verifiedSalePrice != null &&
    subject &&
    isValidPositiveArea(subject.floorSizeM2)
  ) {
    pricePerM2 = {
      value: Math.round(verifiedSalePrice / subject.floorSizeM2),
      calculable: true,
      reason: null,
    };
  } else if (verifiedSalePrice != null) {
    pricePerM2 = {
      value: null,
      calculable: false,
      reason: "floor_size not supplied — land size cannot substitute",
    };
  }

  let pricePerHa: MarketPosition["pricePerHa"] = {
    value: null,
    calculable: false,
    reason: "INSUFFICIENT_DATA",
    approximate: false,
  };
  if (
    verifiedSalePrice != null &&
    subject &&
    isValidPositiveArea(subject.hectares)
  ) {
    pricePerHa = {
      value: Math.round(verifiedSalePrice / subject.hectares),
      calculable: true,
      reason: null,
      approximate: Boolean(subject.hectaresApproximate),
    };
  }

  const compPrices = comparablePrices.filter(isValidPositiveAmount);
  let comparableMedian: number | null = null;
  let comparableRange: MarketPosition["comparableRange"] = { min: null, max: null };

  if (compPrices.length >= II45_MINIMUM_COMPARABLE_SALES) {
    comparableMedian = median(compPrices);
    comparableRange = { min: Math.min(...compPrices), max: Math.max(...compPrices) };
  } else if (compPrices.length > 0) {
    missingCategories.push(
      `${II45_MINIMUM_COMPARABLE_SALES - compPrices.length} verified comparable sales`,
    );
  }

  let areaMedian: number | null = null;
  if (actualSample >= requiredSample) {
    areaMedian = median(salePrices);
  }

  const status =
    actualSample >= requiredSample || compPrices.length >= II45_MINIMUM_COMPARABLE_SALES
      ? "AVAILABLE"
      : "INSUFFICIENT_DATA";

  return {
    status,
    verifiedSalePrice,
    pricePerM2,
    pricePerHa,
    comparableMedian,
    comparableRange,
    areaMedian,
    requiredSample,
    actualSample,
    missingCategories,
    recommendedAction:
      missingCategories.length > 0
        ? "Historical Evidence Acquisition queue — additional verified sale-price observations"
        : null,
  };
}
