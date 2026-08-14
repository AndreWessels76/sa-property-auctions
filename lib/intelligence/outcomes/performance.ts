/**
 * Auction performance metrics with explicit denominators.
 */

import { roundPercent } from "@/lib/intelligence/pricing/priceCalculations";
import type { OutcomeClassification } from "./types";
import type { AuctionPerformanceMetrics } from "./types";

function rate(
  numerator: number,
  denominator: number,
  label: string,
): AuctionPerformanceMetrics["saleRate"] {
  if (denominator <= 0) {
    return { value: null, numerator, denominator, label, calculable: false };
  }
  return {
    value: roundPercent((numerator / denominator) * 100),
    numerator,
    denominator,
    label,
    calculable: true,
  };
}

export function buildAuctionPerformance(
  classifications: OutcomeClassification[],
): AuctionPerformanceMetrics {
  const sold = classifications.filter((c) => c.outcome === "SOLD").length;
  const withdrawn = classifications.filter((c) => c.outcome === "WITHDRAWN").length;
  const cancelled = classifications.filter((c) => c.outcome === "CANCELLED").length;
  const expired = classifications.filter((c) => c.outcome === "EXPIRED").length;
  const unsold = classifications.filter((c) => c.outcome === "UNSOLD").length;
  const postponed = classifications.filter((c) => c.outcome === "POSTPONED").length;
  const unknown = classifications.filter((c) => c.outcome === "UNKNOWN").length;
  const total = classifications.length;
  const confirmed = sold + withdrawn + cancelled;

  return {
    totalAuctions: total,
    sold,
    unsold,
    withdrawn,
    cancelled,
    expired,
    postponed,
    unknown,
    confirmedOutcomes: confirmed,
    saleRate: rate(sold, confirmed, "Sold / auctions with confirmed outcome"),
    withdrawnRate: rate(withdrawn, confirmed, "Withdrawn / auctions with confirmed outcome"),
    cancelledRate: rate(cancelled, confirmed, "Cancelled / auctions with confirmed outcome"),
    unknownOutcomeRate: rate(unknown, total, "Unknown / total historical events"),
    outcomeCoverage: {
      numerator: confirmed,
      denominator: total,
      label: "Confirmed outcomes / total historical events",
      percentage: total > 0 ? roundPercent((confirmed / total) * 100) : null,
    },
  };
}
