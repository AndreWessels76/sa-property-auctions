import { BaseRepository } from "./BaseRepository";

export type PropertyImage = {
  id: string;
  property_id: string;
  image_url: string;
  thumbnail_image?: string | null;
  blur_placeholder?: string | null;
  image_type?: string | null;
  is_primary?: boolean | null;
  is_hero?: boolean | null;
  display_order?: number | null;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  quality_score?: number | null;
  quality_rating?: string | null;
  source?: string | null;
  created_at?: string;
};

export class ImageRepository extends BaseRepository {
  static async byProperty(propertyId: string): Promise<PropertyImage[]> {
    const db = this.publicDb();

    // Order only by columns that exist across all schema versions.
    // Sort primary/hero preference in memory (avoids PostgREST errors on missing columns).
    const { data, error } = await db
      .from("property_images")
      .select("*")
      .eq("property_id", propertyId)
      .order("display_order", { ascending: true });

    if (error) {
      this.handleError("ImageRepository.byProperty", error);
    }

    const images = (data as PropertyImage[]) ?? [];

    return [...images].sort((a, b) => {
      const heroDiff = Number(Boolean(b.is_hero)) - Number(Boolean(a.is_hero));
      if (heroDiff !== 0) {
        return heroDiff;
      }

      const primaryDiff =
        Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
      if (primaryDiff !== 0) {
        return primaryDiff;
      }

      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });
  }

  static async heroImages(
    propertyIds?: string[],
  ): Promise<PropertyImage[]> {
    if (!propertyIds?.length) {
      return [];
    }

    const images = await this.allForProperties(propertyIds);

    const flagged = images.filter(
      (image) => image.is_primary || image.is_hero,
    );

    const pool = flagged.length > 0 ? flagged : images;

    return pool.sort((a, b) => {
      const heroDiff = Number(Boolean(b.is_hero)) - Number(Boolean(a.is_hero));
      if (heroDiff !== 0) {
        return heroDiff;
      }

      const primaryDiff =
        Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
      if (primaryDiff !== 0) {
        return primaryDiff;
      }

      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });
  }

  static async heroMap(
    propertyIds: string[],
  ): Promise<Map<string, PropertyImage>> {
    const images = await this.heroImages(propertyIds);

    const map = new Map<string, PropertyImage>();

    for (const image of images) {
      if (!map.has(image.property_id)) {
        map.set(image.property_id, image);
      }
    }

    return map;
  }

  static async allForProperties(
    propertyIds: string[],
  ): Promise<PropertyImage[]> {
    if (!propertyIds.length) {
      return [];
    }

    const db = this.publicDb();

    const { data, error } = await db
      .from("property_images")
      .select("*")
      .in("property_id", propertyIds)
      .order("display_order", { ascending: true });

    if (error) {
      this.handleError("ImageRepository.allForProperties", error);
    }

    return (data as PropertyImage[]) ?? [];
  }
}
