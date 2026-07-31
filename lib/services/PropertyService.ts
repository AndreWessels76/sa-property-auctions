import { unstable_cache } from "next/cache";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import {
  buildSearchResult,
  type SearchResult,
} from "@/lib/dto/SearchResult";
import { PropertyMapper } from "@/lib/mappers/PropertyMapper";
import { ImageRepository, PropertyRepository } from "@/lib/repositories";

export class PropertyService {
  static readonly DEFAULT_PAGE_SIZE = PropertyRepository.DEFAULT_PAGE_SIZE;

  /** @deprecated Prefer `search()` — loads entire catalog. Kept for heatmaps/internal. */
  static getProperties = unstable_cache(
    async (): Promise<PropertyDTO[]> => {
      const properties = await PropertyRepository.getAll();

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
    const property = await PropertyRepository.getById(id);

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

    if (!result.data.length) {
      return buildSearchResult([], result.total, result.page, result.pageSize);
    }

    const heroMap = await ImageRepository.heroMap(
      result.data.map((property) => property.id),
    );

    const data = result.data.map((property) =>
      PropertyMapper.toDTO(property, heroMap.get(property.id)),
    );

    return {
      ...result,
      data,
    };
  }

  static async search(
    filters: PropertySearchDTO,
  ): Promise<SearchResult<PropertyDTO>> {
    const normalized: PropertySearchDTO = {
      ...filters,
      page: Math.max(1, filters.page ?? 1),
      pageSize: filters.pageSize ?? PropertyService.DEFAULT_PAGE_SIZE,
      sort: filters.sort ?? "auction",
    };

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

    if (normalized.sort === "auction") {
      data.sort((a, b) => {
        if (a.featured !== b.featured) {
          return a.featured ? -1 : 1;
        }

        return (
          new Date(a.auction_date ?? 0).getTime() -
          new Date(b.auction_date ?? 0).getTime()
        );
      });
    }

    return {
      ...result,
      data,
    };
  }
}
