import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { PropertyImage } from "@/lib/repositories/ImageRepository";
import type { Property } from "@/lib/types/property";
import { resolveAuctionAgency } from "@/lib/auction/agencyDisplay";
import { isSeedOrDemo } from "@/lib/data/propertyFoundation";
import { scorePropertyQuality } from "@/lib/data/qualityScore";
import {
  formatVerificationLabel,
} from "@/lib/data/verificationStates";
import { resolveVerificationStateFromRow } from "@/lib/data/multiQualityScore";
import { parseAgriculturalDetails } from "@/lib/property/agricultural";

export class PropertyMapper {
  static toDTO(
    property: Property,
    hero?: PropertyImage,
  ): PropertyDTO {
    const image = hero?.image_url ?? null;
    const agency = resolveAuctionAgency(property.source);
    const quality = scorePropertyQuality({
      ...property,
      hasImages: Boolean(image),
    });

    const classification =
      property.data_classification ?? quality.classification;
    const verificationState = resolveVerificationStateFromRow({
      ...property,
      data_classification: classification,
    });
    const seed = isSeedOrDemo(classification, property.source);
    const pending =
      verificationState === "pending_verification" ||
      classification === "needs_verification";

    return {
      id: property.id,
      title: property.title,
      description: property.description,
      province: property.province,
      town: property.town,
      suburb: property.suburb,
      address: property.address,
      street_address: property.street_address ?? property.address ?? null,
      postal_code: property.postal_code ?? null,
      auction_date: property.auction_date,
      auction_time: property.auction_time ?? null,
      auction_venue: property.auction_venue ?? null,
      auction_price: property.auction_price,
      estimated_value: property.estimated_value,
      reserve_price: property.reserve_price ?? null,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      garages: property.garages,
      property_type: property.property_type,
      status: property.status,
      listing_status: property.listing_status ?? property.status ?? null,
      source: property.source,
      source_name: property.source_name ?? agency.name,
      source_url: property.source_url ?? agency.website,
      auction_agency: property.auction_agency ?? agency.name,
      agency_contact: property.agency_contact ?? agency.contact,
      agency_website: property.agency_website ?? agency.website,
      external_listing_id: property.external_listing_id ?? null,
      imported_at: property.imported_at ?? property.created_at ?? null,
      last_verified_at: property.last_verified_at ?? null,
      data_classification: classification,
      // Overall quality is admin-only; keep null on public DTO surface.
      data_quality_score: null,
      verification_state: verificationState,
      verification_label: formatVerificationLabel(verificationState),
      address_display_mode: property.address_display_mode ?? "full",
      provenance_notes: property.provenance_notes ?? null,
      latitude: property.latitude ?? null,
      longitude: property.longitude ?? null,
      image,
      thumbnail: hero?.thumbnail_image ?? image,
      heroImage: image,
      blur_placeholder: hero?.blur_placeholder ?? null,
      qualityScore: hero?.quality_score ?? null,
      featured: Boolean(hero?.is_hero),
      isSeedOrDemo: seed,
      isPendingVerification: pending && !seed,
      erf_size: property.erf_size ?? null,
      floor_size: property.floor_size ?? null,
      features: property.features ?? null,
      viewing_information: property.viewing_information ?? null,
      deposit_requirements: property.deposit_requirements ?? null,
      terms_link: property.terms_link ?? null,
      brochure_link: property.brochure_link ?? null,
      catalogue_link: property.catalogue_link ?? null,
      registration_link: property.registration_link ?? null,
      agricultural_details: parseAgriculturalDetails(
        property.agricultural_details,
      ),
    };
  }
}
