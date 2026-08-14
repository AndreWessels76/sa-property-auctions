/**
 * Data coverage metrics for historical intelligence transparency.
 */

import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeClassification } from "./types";
import type { DataCoverageMetrics } from "./types";
import { isConfirmedOutcome } from "./classification";

export function buildDataCoverage(
  rows: HistoricalEventObservation[],
  classifications: OutcomeClassification[],
): DataCoverageMetrics {
  const historical = rows;
  const confirmed = classifications.filter((c) => isConfirmedOutcome(c.outcome));
  const sold = classifications.filter((c) => c.outcome === "SOLD");
  const withSalePrice = sold.filter((c) => isValidPositiveAmount(c.salePrice.salePrice));
  const withLocation = historical.filter(
    (r) => Boolean(r.town?.trim()) || Boolean(r.suburb?.trim()) || Boolean(r.province?.trim()),
  );
  const withEvidence = classifications.filter(
    (c) => c.outcomeEvidence.sourceUrl || c.outcomeEvidence.evidenceText,
  );
  const withPrice = historical.filter(
    (r) => isValidPositiveAmount(r.prices.sale_price) || isValidPositiveAmount(r.prices.auction_price),
  );

  return {
    historicalEvents: historical.length,
    outcomeCoverage: {
      numerator: confirmed.length,
      denominator: historical.length,
      label: `${confirmed.length} / ${historical.length}`,
    },
    salePriceCoverage: {
      numerator: withSalePrice.length,
      denominator: sold.length,
      label: `${withSalePrice.length} / ${sold.length} sold events`,
    },
    locationCoverage: {
      numerator: withLocation.length,
      denominator: historical.length,
      label: `${withLocation.length} / ${historical.length}`,
    },
    evidenceCoverage: {
      numerator: withEvidence.length,
      denominator: historical.length,
      label: `${withEvidence.length} / ${historical.length}`,
    },
    priceCoverage: {
      numerator: withPrice.length,
      denominator: historical.length,
      label: `${withPrice.length} / ${historical.length}`,
    },
  };
}

export function dateRangeFromRows(
  rows: HistoricalEventObservation[],
): { from: string | null; to: string | null } {
  const dates = rows
    .map((r) => r.auctionDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  if (dates.length === 0) return { from: null, to: null };
  return { from: dates[0]!, to: dates[dates.length - 1]! };
}

export function formatDateRange(from: string | null, to: string | null): string {
  if (!from && !to) return "Not supplied";
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  return from ? fmt(from) : to ? fmt(to) : "Not supplied";
}
