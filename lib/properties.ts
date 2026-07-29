import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import type { SearchResult } from "@/lib/dto/SearchResult";
import { PropertyService } from "@/lib/services";

export { attachHeroImages } from "@/lib/images/attachHeroImages";

/** @deprecated Prefer `PropertyService.getProperties()` */
export async function getProperties(): Promise<PropertyDTO[]> {
  return PropertyService.getProperties();
}

/** @deprecated Prefer `PropertyService.getProperty()` */
export async function getProperty(id: string): Promise<PropertyDTO | null> {
  return PropertyService.getProperty(id);
}

export async function searchProperties(
  filters: PropertySearchDTO,
): Promise<SearchResult<PropertyDTO>> {
  return PropertyService.search(filters);
}
