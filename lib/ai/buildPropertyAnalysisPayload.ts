import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

export interface PropertyAnalysisPayload {
  title: string;
  province: string | null;
  town: string | null;
  suburb: string | null;
  propertyType: string | null;
  auctionPrice: number | null;
  estimatedValue: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  auctionType: string | null;
  description: string | null;
}

export function buildPropertyAnalysisPayload(
  property: PropertyDTO,
): PropertyAnalysisPayload {
  return {
    title: property.title,
    province: property.province,
    town: property.town,
    suburb: property.suburb,
    propertyType: property.property_type,
    auctionPrice: property.auction_price,
    estimatedValue: property.estimated_value,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    garages: property.garages,
    auctionType: property.source,
    description: property.description,
  };
}
