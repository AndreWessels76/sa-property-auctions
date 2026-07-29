import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { PropertyImage } from "@/lib/repositories/ImageRepository";
import type { Property } from "@/lib/types/property";

export class PropertyMapper {
  static toDTO(
    property: Property,
    hero?: PropertyImage,
  ): PropertyDTO {
    const image = hero?.image_url ?? null;

    return {
      id: property.id,
      title: property.title,
      description: property.description,
      province: property.province,
      town: property.town,
      suburb: property.suburb,
      address: property.address,
      auction_date: property.auction_date,
      auction_price: property.auction_price,
      estimated_value: property.estimated_value,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      garages: property.garages,
      property_type: property.property_type,
      status: property.status,
      source: property.source,
      latitude: property.latitude ?? null,
      longitude: property.longitude ?? null,
      image,
      thumbnail: hero?.thumbnail_image ?? image,
      heroImage: image,
      blur_placeholder: hero?.blur_placeholder ?? null,
      qualityScore: hero?.quality_score ?? null,
      featured: Boolean(hero?.is_hero),
    };
  }
}
