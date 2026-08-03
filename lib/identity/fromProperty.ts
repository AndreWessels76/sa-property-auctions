import { enrichAddressIntelligence } from "@/lib/platform/dataEnrichment";
import { classifyPropertyType } from "@/lib/platform/propertyClassification";
import { normalizeLandExtent } from "@/lib/platform/landIntelligence";
import type { FingerprintInput } from "@/lib/identity/fingerprint";
import type { Property } from "@/lib/types/property";

/**
 * Build fingerprint input from a listing/property row + enrichment.
 * Derived farm/erf tokens are included only when extractable — never fabricated.
 */
export function fingerprintInputFromProperty(
  property: Partial<Property> & {
    title?: string | null;
    farm_name?: string | null;
    farm_number?: string | null;
    erf_number?: string | null;
    portion_number?: string | null;
  },
): FingerprintInput {
  const address = enrichAddressIntelligence({
    province: property.province ?? "",
    town: property.town ?? "",
    suburb: property.suburb ?? null,
    address: property.address ?? null,
    street_address: property.street_address ?? null,
    postal_code: property.postal_code ?? null,
    municipality: property.municipality ?? null,
    title: property.title ?? "",
    description: property.description ?? null,
  });

  const land = normalizeLandExtent({
    erfSize: property.erf_size,
    agriculturalHectares: null,
  });

  return {
    latitude: property.latitude,
    longitude: property.longitude,
    streetAddress: address.street,
    farmName: property.farm_name ?? address.farmName,
    farmNumber: property.farm_number ?? address.farmNumber,
    erfNumber: property.erf_number ?? address.erfNumber,
    portionNumber: property.portion_number ?? address.portion,
    title: property.title,
    town: address.town ?? property.town,
    province: address.province ?? property.province,
    landSizeSqm: land.squareMetres,
    combinedExtent: land.combinedLabel,
    primaryImageHash: null,
    externalReferences: [
      property.external_listing_id,
      property.source_url,
    ],
  };
}

export function classificationFromProperty(property: Partial<Property>): {
  propertyType: string | null;
  confidence: number;
} {
  const classified = classifyPropertyType({
    propertyType: property.property_type,
    title: property.title,
    description: property.description,
  });
  if (!classified) return { propertyType: null, confidence: 0 };
  if (classified === "Other") return { propertyType: "Other", confidence: 25 };
  // Fine-grained specialty types → higher confidence
  const specialty =
    /Farm|Land|House|Apartment|Townhouse|Retail|Office|Warehouse|Industrial|Commercial|Guest|Cluster|Duet|Smallholding|Mixed/.test(
      classified,
    );
  return {
    propertyType: classified,
    confidence: specialty ? 80 : 60,
  };
}
