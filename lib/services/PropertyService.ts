import { unstable_cache } from "next/cache";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import {
  buildSearchResult,
  type SearchResult,
} from "@/lib/dto/SearchResult";
import { PropertyMapper } from "@/lib/mappers/PropertyMapper";
import { ImageRepository, PropertyRepository } from "@/lib/repositories";
import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import {
  normalizeSearchFilters,
  searchRankingScore,
} from "@/lib/platform/searchIntelligence";
import {
  matchesAgriculturalType,
  suppliedHectares,
} from "@/lib/intelligence/agriculturalSearch";

export class PropertyService {
  static readonly DEFAULT_PAGE_SIZE = PropertyRepository.DEFAULT_PAGE_SIZE;

  /** @deprecated Prefer `search()` — loads entire catalog. Kept for heatmaps/internal. */
  static getProperties = unstable_cache(
    async (): Promise<PropertyDTO[]> => {
      const properties = await PropertyRepository.getPublicAll();

      const heroMap = await ImageRepository.heroMap(
        properties.map((p) => p.id),
      );

      return properties.map((property) =>
        PropertyMapper.toDTO(property, heroMap.get(property.id)),
      );
    },
    ["properties"],
    {
      revalidate: 300,
      tags: ["properties"],
    },
  );

  static async getProperty(id: string): Promise<PropertyDTO | null> {
    const property = await PropertyRepository.getPublicById(id);

    if (!property) {
      return null;
    }

    const heroMap = await ImageRepository.heroMap([id]);

    return PropertyMapper.toDTO(property, heroMap.get(id));
  }

  static async getByIds(
    ids: string[],
    page = 1,
    pageSize = PropertyService.DEFAULT_PAGE_SIZE,
  ): Promise<SearchResult<PropertyDTO>> {
    const result = await PropertyRepository.getByIds(ids, page, pageSize);

    const visible = result.data.filter((property) =>
      isPubliclyActiveListing({
        verification_state: property.verification_state,
        data_classification: property.data_classification,
        listing_status: property.listing_status,
        status: property.status,
        auction_date: property.auction_date,
      }),
    );

    if (!visible.length) {
      return buildSearchResult([], 0, result.page, result.pageSize);
    }

    const heroMap = await ImageRepository.heroMap(
      visible.map((property) => property.id),
    );

    const data = visible.map((property) =>
      PropertyMapper.toDTO(property, heroMap.get(property.id)),
    );

    return {
      ...result,
      data,
      total: visible.length,
    };
  }

  static async search(
    filters: PropertySearchDTO,
  ): Promise<SearchResult<PropertyDTO>> {
    const normalized = normalizeSearchFilters({
      ...filters,
      page: Math.max(1, filters.page ?? 1),
      pageSize: filters.pageSize ?? PropertyService.DEFAULT_PAGE_SIZE,
      sort: filters.sort ?? "auction",
    });

    const result = await PropertyRepository.search(normalized);

    if (!result.data.length) {
      return buildSearchResult([], result.total, result.page, result.pageSize);
    }

    const heroMap = await ImageRepository.heroMap(
      result.data.map((property) => property.id),
    );

    const data = result.data.map((property) =>
      PropertyMapper.toDTO(property, heroMap.get(property.id)),
    );

    const filtered = data.filter((property) => {
      if (
        normalized.agriculturalType &&
        !matchesAgriculturalType(property, normalized.agriculturalType)
      ) {
        return false;
      }
      const ha = suppliedHectares(property);
      if (normalized.minHectares != null) {
        if (ha == null || ha < normalized.minHectares) return false;
      }
      if (normalized.maxHectares != null) {
        if (ha == null || ha > normalized.maxHectares) return false;
      }
      return true;
    });

    if (normalized.sort === "auction") {
      const typeNeedle = normalized.propertyType?.toLowerCase() ?? "";
      const townNeedle = normalized.town?.toLowerCase() ?? "";
      filtered.sort((a, b) => {
        const scoreDiff =
          searchRankingScore({
            featured: b.featured,
            auctionDate: b.auction_date,
            hasImages: Boolean(b.heroImage || b.image),
            town: b.town,
            province: b.province,
            verificationState: b.verification_state,
            townMatch: Boolean(
              townNeedle && b.town?.toLowerCase() === townNeedle,
            ),
            typeMatch: Boolean(
              typeNeedle &&
                b.property_type?.toLowerCase().includes(typeNeedle.toLowerCase()),
            ),
            hasAgency: Boolean(b.auction_agency || b.source_name),
            hasLandSize: b.erf_size != null || suppliedHectares(b) != null,
          }) -
          searchRankingScore({
            featured: a.featured,
            auctionDate: a.auction_date,
            hasImages: Boolean(a.heroImage || a.image),
            town: a.town,
            province: a.province,
            verificationState: a.verification_state,
            townMatch: Boolean(
              townNeedle && a.town?.toLowerCase() === townNeedle,
            ),
            typeMatch: Boolean(
              typeNeedle &&
                a.property_type?.toLowerCase().includes(typeNeedle.toLowerCase()),
            ),
            hasAgency: Boolean(a.auction_agency || a.source_name),
            hasLandSize: a.erf_size != null || suppliedHectares(a) != null,
          });
        if (scoreDiff !== 0) return scoreDiff;

        return (
          new Date(a.auction_date ?? 0).getTime() -
          new Date(b.auction_date ?? 0).getTime()
        );
      });
    }

    return {
      ...result,
      data: filtered,
      total:
        filtered.length === data.length ? result.total : filtered.length,
    };
  }

  /** Watchlist / workspace: retain historical rows; do not apply public catalogue hide. */
  static async getForWorkspace(
    ids: string[],
  ): Promise<PropertyDTO[]> {
    const unique = [...new Set(ids.filter(Boolean))].slice(0, 80);
    if (!unique.length) return [];
    const result = await PropertyRepository.getByIds(unique, 1, unique.length);
    if (!result.data.length) return [];
    const heroMap = await ImageRepository.heroMap(
      result.data.map((p) => p.id),
    );
    return result.data.map((property) =>
      PropertyMapper.toDTO(property, heroMap.get(property.id)),
    );
  }
}
