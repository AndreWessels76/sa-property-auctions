import { ImageRepository } from "@/lib/repositories";
import { mapPropertyHero } from "@/lib/properties/mapPropertyHero";
import type { Property } from "@/lib/types/property";

export async function attachHeroImages(
  properties: Property[],
): Promise<Property[]> {
  if (!properties.length) {
    return [];
  }

  const propertyIds = properties.map((property) => property.id);
  const heroMap = await ImageRepository.heroMap(propertyIds);

  return properties.map((property) =>
    mapPropertyHero(property, heroMap.get(property.id)),
  );
}
