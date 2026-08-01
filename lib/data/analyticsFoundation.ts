import type { Property } from "@/lib/types/property";
import { resolveVerificationStateFromRow } from "@/lib/data/multiQualityScore";

/**
 * Analytics foundation — only compute from verified/sold rows.
 * Returns null metrics when sample is insufficient. Never fabricates.
 */

export type AnalyticsFoundationResult = {
  sampleSize: number;
  averageDiscount: number | null;
  averageAuctionPrice: number | null;
  provinceStatistics: Record<string, number>;
  agencyStatistics: Record<string, number>;
  propertyTypeStatistics: Record<string, number>;
  auctionSuccessRate: number | null;
  monthlyTrends: Array<{ month: string; count: number; avgPrice: number | null }>;
  notes: string[];
};

function isAnalyticsEligible(property: Property): boolean {
  const state = resolveVerificationStateFromRow(property);
  return state === "verified" || state === "sold" || state === "expired";
}

export function buildAnalyticsFoundation(
  properties: Property[],
): AnalyticsFoundationResult {
  const eligible = properties.filter(isAnalyticsEligible);
  const notes: string[] = [];

  if (eligible.length === 0) {
    notes.push(
      "No verified/sold/expired listings available — analytics withheld (no fake calculations).",
    );
    return {
      sampleSize: 0,
      averageDiscount: null,
      averageAuctionPrice: null,
      provinceStatistics: {},
      agencyStatistics: {},
      propertyTypeStatistics: {},
      auctionSuccessRate: null,
      monthlyTrends: [],
      notes,
    };
  }

  const prices = eligible
    .map((p) => p.auction_price)
    .filter((n): n is number => typeof n === "number" && n > 0);

  const discounts: number[] = [];
  for (const p of eligible) {
    if (
      typeof p.estimated_value === "number" &&
      p.estimated_value > 0 &&
      typeof p.auction_price === "number" &&
      p.auction_price > 0
    ) {
      discounts.push(
        ((p.estimated_value - p.auction_price) / p.estimated_value) * 100,
      );
    }
  }

  const provinceStatistics: Record<string, number> = {};
  const agencyStatistics: Record<string, number> = {};
  const propertyTypeStatistics: Record<string, number> = {};
  const monthlyMap = new Map<string, { count: number; priceSum: number; priceN: number }>();

  let sold = 0;
  let concluded = 0;

  for (const p of eligible) {
    const province = p.province?.trim() || "Unknown";
    provinceStatistics[province] = (provinceStatistics[province] ?? 0) + 1;

    const agency =
      p.auction_agency?.trim() || p.source_name?.trim() || p.source?.trim() || "Unknown";
    agencyStatistics[agency] = (agencyStatistics[agency] ?? 0) + 1;

    const type = p.property_type?.trim() || "Unknown";
    propertyTypeStatistics[type] = (propertyTypeStatistics[type] ?? 0) + 1;

    const state = resolveVerificationStateFromRow(p);
    if (state === "sold") {
      sold += 1;
      concluded += 1;
    } else if (state === "expired" || state === "withdrawn") {
      concluded += 1;
    }

    const month = (p.auction_date || "").slice(0, 7);
    if (month) {
      const entry = monthlyMap.get(month) ?? { count: 0, priceSum: 0, priceN: 0 };
      entry.count += 1;
      if (typeof p.auction_price === "number" && p.auction_price > 0) {
        entry.priceSum += p.auction_price;
        entry.priceN += 1;
      }
      monthlyMap.set(month, entry);
    }
  }

  if (discounts.length === 0) {
    notes.push("Average discount unavailable — missing estimated_value/auction_price pairs.");
  }
  if (concluded === 0) {
    notes.push("Auction success rate unavailable — no concluded (sold/expired/withdrawn) outcomes.");
  }

  const monthlyTrends = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      count: v.count,
      avgPrice: v.priceN > 0 ? Math.round(v.priceSum / v.priceN) : null,
    }));

  return {
    sampleSize: eligible.length,
    averageDiscount:
      discounts.length > 0
        ? Math.round(
            (discounts.reduce((a, b) => a + b, 0) / discounts.length) * 10,
          ) / 10
        : null,
    averageAuctionPrice:
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : null,
    provinceStatistics,
    agencyStatistics,
    propertyTypeStatistics,
    auctionSuccessRate:
      concluded > 0 ? Math.round((sold / concluded) * 1000) / 10 : null,
    monthlyTrends,
    notes,
  };
}
