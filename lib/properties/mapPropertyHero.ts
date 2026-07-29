import type { Property } from "@/lib/types/property";
import type { PropertyImage } from "@/lib/repositories/ImageRepository";

export function mapPropertyHero(
  property: Property,
  hero?: PropertyImage | null,
): Property {
  const image = hero?.image_url ?? null;
  const thumbnail = hero?.thumbnail_image ?? image;

  return {
    ...property,
    image,
    thumbnail,
    heroImage: image,
  };
}
