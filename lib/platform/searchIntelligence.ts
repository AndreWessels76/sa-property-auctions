import { normalizeProvince } from "@/lib/acquisition/validateListing";
import { normalizeTown, findTownInQuery } from "@/lib/ai/towns";
import {
  classifyPropertyType,
  propertyTypeSearchBucket,
} from "@/lib/platform/propertyClassification";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

/**
 * Search Intelligence — normalize filters + ranking helpers.
 * No fabricated relevance scores beyond deterministic field matches.
 */

export type NormalizedSearchFilters = PropertySearchDTO & {
  normalizedTown?: string | null;
  normalizedProvince?: string | null;
  normalizedPropertyType?: string | null;
};

export function normalizeSearchFilters(
  filters: PropertySearchDTO,
): NormalizedSearchFilters {
  const search = filters.search?.trim() || undefined;
  let town = filters.town?.trim() || undefined;
  let province = filters.province?.trim() || undefined;
  let propertyType = filters.propertyType?.trim() || undefined;

  if (search) {
    const foundTown = findTownInQuery(search);
    if (foundTown && !town) town = foundTown;
  }

  const normalizedTown = town ? normalizeTown(town) : null;
  const normalizedProvince = province
    ? normalizeProvince(province) ?? province
    : null;

  let normalizedPropertyType: string | null = null;
  if (propertyType) {
    const classified = classifyPropertyType({ propertyType });
    normalizedPropertyType = classified
      ? propertyTypeSearchBucket(classified)
      : propertyTypeSearchBucket(propertyType);
  }

  return {
    ...filters,
    search,
    town: normalizedTown ?? town,
    province: normalizedProvince ?? province,
    propertyType: normalizedPropertyType ?? propertyType,
    normalizedTown,
    normalizedProvince,
    normalizedPropertyType,
  };
}

/**
 * Deterministic ranking boost for catalogue sort when sort=auction.
 * Higher is better. Based only on verified field presence + auction proximity.
 */
export function searchRankingScore(input: {
  featured?: boolean | null;
  auctionDate?: string | null;
  hasImages?: boolean;
  town?: string | null;
  province?: string | null;
  verificationState?: string | null;
  now?: Date;
  /** Deterministic filter-match boosts — never AI-invented. */
  townMatch?: boolean;
  typeMatch?: boolean;
  hasAgency?: boolean;
  hasLandSize?: boolean;
}): number {
  let score = 0;
  if (input.featured) score += 1000;
  if (input.verificationState === "verified") score += 100;
  if (input.hasImages) score += 20;
  if (input.town?.trim()) score += 10;
  if (input.province?.trim()) score += 10;
  if (input.townMatch) score += 40;
  if (input.typeMatch) score += 25;
  if (input.hasAgency) score += 8;
  if (input.hasLandSize) score += 8;

  if (input.auctionDate) {
    const d = new Date(input.auctionDate);
    if (!Number.isNaN(d.getTime())) {
      const now = input.now ?? new Date();
      const days = Math.round(
        (d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (days >= 0 && days <= 7) score += 50 - days;
      else if (days > 7) score += Math.max(0, 30 - Math.floor(days / 7));
    }
  }

  return score;
}

export function dedupeSearchTokens(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v?.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
