import {
  scoreMultiDimensionalQuality,
  type MultiQualityScores,
} from "@/lib/data/multiQualityScore";
import type { PropertyQualityInput } from "@/lib/data/qualityScore";
import type { Property } from "@/lib/types/property";

/**
 * Data Quality Engine — deterministic multi-score for every listing.
 */

export type ListingQualityProfile = MultiQualityScores & {
  locationScore: number;
  documentationScore: number;
  overallListingQuality: number;
};

export function scoreDocumentation(input: {
  brochure_link?: string | null;
  catalogue_link?: string | null;
  terms_link?: string | null;
  viewing_information?: string | null;
  registration_link?: string | null;
}): number {
  let score = 0;
  if (input.brochure_link?.trim() || input.catalogue_link?.trim()) score += 35;
  if (input.terms_link?.trim()) score += 25;
  if (input.viewing_information?.trim()) score += 25;
  if (input.registration_link?.trim()) score += 15;
  return Math.min(100, score);
}

export function buildListingQualityProfile(
  input: PropertyQualityInput & {
    verification_state?: string | null;
    imageQualityScore?: number | null;
    municipality?: string | null;
    auction_time?: string | null;
    auction_venue?: string | null;
    agency_contact?: string | null;
    catalogue_link?: string | null;
    brochure_link?: string | null;
    terms_link?: string | null;
    viewing_information?: string | null;
    registration_link?: string | null;
  },
): ListingQualityProfile {
  const multi = scoreMultiDimensionalQuality(input);
  const locationScore = multi.addressScore;
  const documentationScore = scoreDocumentation(input);
  const overallListingQuality = Math.round(
    multi.completenessScore * 0.2 +
      multi.verificationScore * 0.18 +
      multi.imageScore * 0.12 +
      locationScore * 0.15 +
      multi.auctionScore * 0.15 +
      documentationScore * 0.1 +
      multi.sourceTrustScore * 0.1,
  );

  return {
    ...multi,
    locationScore,
    documentationScore,
    overallListingQuality: Math.min(100, Math.max(0, overallListingQuality)),
  };
}

export function buildListingQualityProfileFromProperty(
  property: Property,
  hasImages: boolean,
): ListingQualityProfile {
  return buildListingQualityProfile({
    title: property.title,
    description: property.description,
    address: property.address,
    street_address: property.street_address,
    suburb: property.suburb,
    town: property.town,
    province: property.province,
    postal_code: property.postal_code,
    property_type: property.property_type,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    auction_date: property.auction_date,
    auction_price: property.auction_price,
    estimated_value: property.estimated_value,
    auction_agency: property.auction_agency,
    source: property.source,
    source_name: property.source_name,
    source_url: property.source_url,
    external_listing_id: property.external_listing_id,
    imported_at: property.imported_at,
    last_verified_at: property.last_verified_at,
    data_classification: property.data_classification,
    listing_status: property.listing_status,
    status: property.status,
    latitude: property.latitude,
    longitude: property.longitude,
    hasImages,
    verification_state: property.verification_state,
    municipality: property.municipality,
    auction_time: property.auction_time,
    auction_venue: property.auction_venue,
    agency_contact: property.agency_contact,
    catalogue_link: property.catalogue_link,
    brochure_link: property.brochure_link,
    terms_link: property.terms_link,
    viewing_information: property.viewing_information,
    registration_link: property.registration_link,
  });
}
