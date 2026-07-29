import { unstable_cache } from "next/cache";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import type { SearchResult } from "@/lib/dto/SearchResult";
import { PropertyMapper } from "@/lib/mappers/PropertyMapper";
import { ImageRepository, PropertyRepository } from "@/lib/repositories";

export class PropertyService {
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

  static async search(
    filters: PropertySearchDTO,
  ): Promise<SearchResult<PropertyDTO>> {
    const result = await PropertyRepository.search(filters);

    if (!result.data.length) {
      return {
        data: [],
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }

    const heroMap = await ImageRepository.heroMap(
      result.data.map((property) => property.id),
    );

    const data = result.data.map((property) =>
      PropertyMapper.toDTO(property, heroMap.get(property.id)),
    );

    if (filters.sort === "auction") {
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