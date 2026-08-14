/**
 * Price change on same Property Master — verified sale_price only.
 */

import { isValidPositiveAmount, roundPercent } from "@/lib/intelligence/pricing/priceCalculations";
import type { OutcomeClassification } from "./types";
import type { MasterPriceChange } from "./types";

export function buildMasterPriceChange(
  masterId: string,
  classifications: OutcomeClassification[],
): MasterPriceChange {
  const sold = classifications
    .filter(
      (c) =>
        c.outcome === "SOLD" &&
        c.outcomeEvidence.propertyMasterId === masterId &&
        isValidPositiveAmount(c.salePrice.salePrice) &&
        !c.salePrice.conflict,
    )
    .sort((a, b) =>
      (a.outcomeEvidence.sourceTimestamp ?? "").localeCompare(
        b.outcomeEvidence.sourceTimestamp ?? "",
      ),
    );

  if (sold.length < 2) {
    return {
      propertyMasterId: masterId,
      previousSalePrice: null,
      latestSalePrice: sold[0]?.salePrice.salePrice ?? null,
      absoluteChange: null,
      percentageChange: null,
      timeBetweenSalesDays: null,
      calculable: false,
      narrative: "Verified previous sale price unavailable",
    };
  }

  const prev = sold[sold.length - 2]!;
  const latest = sold[sold.length - 1]!;
  const p = prev.salePrice.salePrice!;
  const l = latest.salePrice.salePrice!;
  const abs = l - p;
  const pct = roundPercent((abs / p) * 100);

  let days: number | null = null;
  const t1 = prev.outcomeEvidence.sourceTimestamp;
  const t2 = latest.outcomeEvidence.sourceTimestamp;
  if (t1 && t2) {
    days = Math.round(
      (new Date(t2).getTime() - new Date(t1).getTime()) / (24 * 60 * 60 * 1000),
    );
  }

  return {
    propertyMasterId: masterId,
    previousSalePrice: p,
    latestSalePrice: l,
    absoluteChange: abs,
    percentageChange: pct,
    timeBetweenSalesDays: days,
    calculable: true,
    narrative: `Verified sale prices: ${p.toLocaleString("en-ZA")} → ${l.toLocaleString("en-ZA")} (${pct}%)`,
  };
}
