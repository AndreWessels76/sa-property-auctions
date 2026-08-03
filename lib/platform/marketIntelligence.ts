import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import { propertyTypeSearchBucket } from "@/lib/platform/propertyClassification";
import { avg, monthKey } from "@/lib/platform/statsMath";
import type { Property } from "@/lib/types/property";

/**
 * Market Intelligence — sector statistics from verified (+ historical) data.
 * Growth / trends only when dated samples exist. Never fabricated.
 */

export type MarketSector =
  | "Residential"
  | "Commercial"
  | "Industrial"
  | "Agricultural"
  | "Vacant Land"
  | "Other";

export type MarketSectorStats = {
  sector: MarketSector;
  listingCount: number;
  activeCount: number;
  averageReserve: number | null;
  averageAuctionPrice: number | null;
  averageDiscountPercent: number | null;
  monthlyActivity: Array<{ month: string; count: number }>;
  notes: string[];
};

export type MarketIntelligenceReport = {
  generatedAt: string;
  totalEligible: number;
  sectors: MarketSectorStats[];
  areaTrends: Array<{
    town: string;
    province: string | null;
    count: number;
    activeCount: number;
  }>;
};

function toSector(propertyType: string | null | undefined): MarketSector {
  const bucket = propertyTypeSearchBucket(propertyType);
  if (bucket === "House" || bucket === "Apartment" || bucket === "Townhouse") {
    return "Residential";
  }
  if (bucket === "Commercial") return "Commercial";
  if (bucket === "Industrial") return "Industrial";
  if (bucket === "Farm") return "Agricultural";
  if (bucket === "Vacant Land") return "Vacant Land";
  return "Other";
}

function eligible(p: Property): boolean {
  const state = normalizeVerificationState(p.verification_state);
  return (
    state === "verified" ||
    state === "sold" ||
    state === "expired" ||
    state === "withdrawn"
  );
}

function buildSector(
  sector: MarketSector,
  rows: Property[],
  now: Date,
): MarketSectorStats {
  const notes: string[] = [];
  const mine = rows.filter((p) => toSector(p.property_type) === sector);
  const active = mine.filter((p) =>
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
      now,
    }),
  );

  const reserves = mine
    .map((p) => p.reserve_price)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const prices = mine
    .map((p) => p.auction_price)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const discounts: number[] = [];
  for (const p of mine) {
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

  const byMonth: Record<string, number> = {};
  for (const p of mine) {
    const m = monthKey(p.auction_date);
    if (m) byMonth[m] = (byMonth[m] ?? 0) + 1;
  }
  const monthlyActivity = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  if (reserves.length === 0) notes.push("Average reserve withheld.");
  if (discounts.length === 0) notes.push("Average discount withheld.");
  if (monthlyActivity.length < 2) {
    notes.push("Growth trend withheld — need activity across multiple months.");
  }

  return {
    sector,
    listingCount: mine.length,
    activeCount: active.length,
    averageReserve: avg(reserves),
    averageAuctionPrice: avg(prices),
    averageDiscountPercent: avg(discounts),
    monthlyActivity,
    notes,
  };
}

export function buildMarketIntelligence(
  rows: Property[],
  now = new Date(),
): MarketIntelligenceReport {
  const pool = rows.filter(eligible);
  const sectors: MarketSector[] = [
    "Residential",
    "Commercial",
    "Industrial",
    "Agricultural",
    "Vacant Land",
    "Other",
  ];

  const townMap = new Map<
    string,
    { town: string; province: string | null; count: number; activeCount: number }
  >();
  for (const p of pool) {
    const town = p.town?.trim();
    if (!town) continue;
    const key = town.toLowerCase();
    const cur = townMap.get(key) ?? {
      town,
      province: p.province ?? null,
      count: 0,
      activeCount: 0,
    };
    cur.count += 1;
    if (
      isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
        now,
      })
    ) {
      cur.activeCount += 1;
    }
    townMap.set(key, cur);
  }

  return {
    generatedAt: now.toISOString(),
    totalEligible: pool.length,
    sectors: sectors.map((s) => buildSector(s, pool, now)),
    areaTrends: [...townMap.values()].sort((a, b) => b.count - a.count),
  };
}
