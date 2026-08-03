import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import { averageLandSquareMetres } from "@/lib/platform/landIntelligence";
import { propertyTypeSearchBucket } from "@/lib/platform/propertyClassification";
import type { Property } from "@/lib/types/property";

/**
 * Area Intelligence — verified statistics per town.
 * Null averages when sample insufficient — never fabricated.
 */

export type AreaIntelligenceProfile = {
  town: string;
  province: string | null;
  verifiedAuctions: number;
  upcomingAuctions: number;
  averageAuctionFrequencyPerMonth: number | null;
  propertyMix: Record<string, number>;
  averageLandSizeSqm: number | null;
  averageReserve: number | null;
  averageAuctionDiscount: number | null;
  averageDaysUntilAuction: number | null;
  agencyDistribution: Record<string, number>;
  verificationQualityAverage: number | null;
  sampleNotes: string[];
};

function daysUntil(auctionDate: string | null | undefined, now: Date): number | null {
  if (!auctionDate) return null;
  const d = new Date(auctionDate);
  if (Number.isNaN(d.getTime())) return null;
  const ms =
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

export function buildAreaIntelligence(
  town: string,
  rows: Property[],
  now = new Date(),
): AreaIntelligenceProfile {
  const notes: string[] = [];
  const inTown = rows.filter(
    (p) => p.town?.trim().toLowerCase() === town.trim().toLowerCase(),
  );

  const verified = inTown.filter((p) => {
    const state = normalizeVerificationState(p.verification_state);
    return state === "verified" || state === "sold" || state === "expired";
  });

  const upcoming = verified.filter((p) =>
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
      now,
    }),
  );

  const propertyMix: Record<string, number> = {};
  const agencies: Record<string, number> = {};
  for (const p of verified) {
    const bucket = propertyTypeSearchBucket(p.property_type);
    propertyMix[bucket] = (propertyMix[bucket] ?? 0) + 1;
    const agency = (p.auction_agency || p.source_name || "").trim();
    if (agency) agencies[agency] = (agencies[agency] ?? 0) + 1;
  }

  const reserves = verified
    .map((p) => p.reserve_price)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const discounts: number[] = [];
  for (const p of verified) {
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

  const days = upcoming
    .map((p) => daysUntil(p.auction_date, now))
    .filter((n): n is number => n != null && n >= 0);

  const quality = verified
    .map((p) => p.data_quality_score ?? p.completeness_score)
    .filter((n): n is number => typeof n === "number" && n >= 0);

  const landAvg = averageLandSquareMetres(verified.map((p) => p.erf_size));

  // Frequency: verified auctions / months spanned (min 1 month). Null if < 2 dates.
  const dates = verified
    .map((p) => (p.auction_date ? new Date(p.auction_date).getTime() : NaN))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  let frequency: number | null = null;
  if (dates.length >= 2) {
    const months =
      Math.max(1, (dates[dates.length - 1]! - dates[0]!) / (30.44 * 24 * 60 * 60 * 1000));
    frequency = Math.round((dates.length / months) * 100) / 100;
  } else if (dates.length === 1) {
    notes.push("Frequency withheld — need at least two dated auctions in town.");
  } else {
    notes.push("No dated auctions for frequency.");
  }

  if (reserves.length === 0) notes.push("Average reserve withheld — no reserve prices.");
  if (discounts.length === 0) {
    notes.push("Average discount withheld — need estimated_value + auction_price pairs.");
  }

  return {
    town,
    province: verified[0]?.province ?? inTown[0]?.province ?? null,
    verifiedAuctions: verified.length,
    upcomingAuctions: upcoming.length,
    averageAuctionFrequencyPerMonth: frequency,
    propertyMix,
    averageLandSizeSqm: landAvg,
    averageReserve: avg(reserves),
    averageAuctionDiscount: avg(discounts),
    averageDaysUntilAuction: avg(days),
    agencyDistribution: agencies,
    verificationQualityAverage: avg(quality),
    sampleNotes: notes,
  };
}

export function buildAllAreaIntelligence(
  rows: Property[],
  now = new Date(),
): AreaIntelligenceProfile[] {
  const towns = new Set<string>();
  for (const p of rows) {
    if (p.town?.trim()) towns.add(p.town.trim());
  }
  return [...towns]
    .sort((a, b) => a.localeCompare(b))
    .map((town) => buildAreaIntelligence(town, rows, now));
}
