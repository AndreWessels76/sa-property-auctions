import { normalizeListingStatus } from "@/lib/data/propertyFoundation";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import { suggestLifecycleFromDates } from "@/lib/data/listingLifecycle";
import type { Property } from "@/lib/types/property";

/**
 * Historical Intelligence — completed / withdrawn / cancelled / expired.
 * Hidden from public catalogue; used for comps, area stats, heat maps, trends.
 */

export type HistoricalCategory =
  | "sold"
  | "withdrawn"
  | "cancelled"
  | "expired"
  | "completed"
  | "other_historical";

export type HistoricalRecord = {
  id: string;
  category: HistoricalCategory;
  town: string | null;
  province: string | null;
  propertyType: string | null;
  auctionDate: string | null;
  auctionPrice: number | null;
  agency: string | null;
};

export type HistoricalIntelligenceSummary = {
  total: number;
  byCategory: Record<HistoricalCategory, number>;
  records: HistoricalRecord[];
};

export function classifyHistoricalCategory(
  property: Property,
  now = new Date(),
): HistoricalCategory | null {
  const verification = normalizeVerificationState(property.verification_state);
  const listing = normalizeListingStatus(
    property.listing_status ?? property.status,
  );

  if (verification === "sold" || listing === "sold") return "sold";
  if (listing === "cancelled") return "cancelled";
  if (verification === "withdrawn" || listing === "withdrawn") return "withdrawn";
  if (listing === "completed") return "completed";
  if (verification === "expired") return "expired";

  const lifecycle = suggestLifecycleFromDates({
    auctionDate: property.auction_date,
    currentStatus: listing ?? property.status,
    now,
  });
  if (lifecycle === "expired") return "expired";
  if (lifecycle === "sold") return "sold";
  if (lifecycle === "withdrawn") return "withdrawn";

  // Verified upcoming/live are not historical
  if (verification === "verified" && (lifecycle === "upcoming" || lifecycle === "live")) {
    return null;
  }
  if (verification === "verified" && lifecycle === "archived") {
    return "completed";
  }

  return null;
}

export function isHistoricalListing(property: Property, now = new Date()): boolean {
  return classifyHistoricalCategory(property, now) != null;
}

export function buildHistoricalIntelligence(
  rows: Property[],
  now = new Date(),
): HistoricalIntelligenceSummary {
  const byCategory: Record<HistoricalCategory, number> = {
    sold: 0,
    withdrawn: 0,
    cancelled: 0,
    expired: 0,
    completed: 0,
    other_historical: 0,
  };

  const records: HistoricalRecord[] = [];
  for (const p of rows) {
    const category = classifyHistoricalCategory(p, now);
    if (!category) continue;
    byCategory[category] += 1;
    records.push({
      id: p.id,
      category,
      town: p.town ?? null,
      province: p.province ?? null,
      propertyType: p.property_type ?? null,
      auctionDate: p.auction_date ?? null,
      auctionPrice:
        typeof p.auction_price === "number" ? p.auction_price : null,
      agency: (p.auction_agency || p.source_name || null)?.trim() || null,
    });
  }

  return {
    total: records.length,
    byCategory,
    records,
  };
}
