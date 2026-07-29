import type { Property } from "@/lib/types/property";

export function mergeProperty(
  existing: Property,
  incoming: Property
): Property {

  return {

    ...existing,

    title:
      incoming.title || existing.title,

    description:
      incoming.description ||
      existing.description,

    address:
      incoming.address ||
      existing.address,

    suburb:
      incoming.suburb ||
      existing.suburb,

    town:
      incoming.town ||
      existing.town,

    province:
      incoming.province ||
      existing.province,

    property_type:
      incoming.property_type ||
      existing.property_type,

    bedrooms:
      incoming.bedrooms > 0
        ? incoming.bedrooms
        : existing.bedrooms,

    bathrooms:
      incoming.bathrooms > 0
        ? incoming.bathrooms
        : existing.bathrooms,

    garages:
      incoming.garages > 0
        ? incoming.garages
        : existing.garages,

    estimated_value:
      incoming.estimated_value > 0
        ? incoming.estimated_value
        : existing.estimated_value,

    auction_price:
      incoming.auction_price > 0
        ? incoming.auction_price
        : existing.auction_price,

    auction_date:
      incoming.auction_date ||
      existing.auction_date,

    updated_at:
      new Date().toISOString(),

  };

}