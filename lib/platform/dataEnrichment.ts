import { normalizeProvince } from "@/lib/acquisition/validateListing";
import { normalizeTown } from "@/lib/ai/towns";
import { classifyPropertyType } from "@/lib/platform/propertyClassification";
import {
  normalizeLandExtent,
  type LandExtent,
} from "@/lib/platform/landIntelligence";
import type { Property } from "@/lib/types/property";

/**
 * Address / GPS / classification enrichment from verified fields only.
 * Never invents coordinates or missing address parts.
 */

export type AddressIntelligence = {
  province: string | null;
  town: string | null;
  suburb: string | null;
  street: string | null;
  farmName: string | null;
  farmNumber: string | null;
  erfNumber: string | null;
  portion: string | null;
  municipality: string | null;
  ward: string | null;
  postalCode: string | null;
};

export type GpsIntelligence = {
  latitude: number | null;
  longitude: number | null;
  municipality: string | null;
  region: string | null;
  hasVerifiedCoordinates: boolean;
  /** Boundary placeholders — reserved until polygon data exists. */
  areaBoundary: null;
};

export type EnrichmentResult = {
  address: AddressIntelligence;
  gps: GpsIntelligence;
  propertyType: string | null;
  propertyTypeChanged: boolean;
  land: LandExtent;
  enrichmentHash: string;
};

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function extractFarmSignals(text: string | null | undefined): {
  farmName: string | null;
  farmNumber: string | null;
  portion: string | null;
  erfNumber: string | null;
} {
  if (!text?.trim()) {
    return { farmName: null, farmNumber: null, portion: null, erfNumber: null };
  }
  const farmNumber =
    text.match(/\b(?:farm\s*(?:no\.?|number)?\s*)(\d+[a-z]?)\b/i)?.[1] ?? null;
  const portion =
    text.match(/\bportion\s*(?:no\.?|number)?\s*(\d+[a-z]?)\b/i)?.[1] ?? null;
  const erfNumber =
    text.match(/\berf\s*(?:no\.?|number)?\s*(\d+[a-z]?)\b/i)?.[1] ??
    text.match(/\bstand\s*(?:no\.?|number)?\s*(\d+[a-z]?)\b/i)?.[1] ??
    null;
  const farmNameMatch = text.match(
    /\b(?:farm|plaas)\s+([A-Za-z][A-Za-z0-9\s'-]{1,40}?)(?:\s*,|\s+portion|\s+no\.|\s+#|$)/i,
  );
  const farmName = farmNameMatch?.[1]?.trim()
    ? titleCase(farmNameMatch[1].trim())
    : null;
  return { farmName, farmNumber, portion, erfNumber };
}

function cleanTownish(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  // Reject obvious non-town extraction noise (utility / amenity lines).
  if (
    /electricity|water\s*supply|borehole|solar|wifi|fibre|click|viewing|auction/i.test(
      raw,
    )
  ) {
    return null;
  }
  if (raw.length > 48) return null;
  try {
    return normalizeTown(raw);
  } catch {
    return titleCase(raw);
  }
}

export function enrichAddressIntelligence(
  property: Pick<
    Property,
    | "province"
    | "town"
    | "suburb"
    | "address"
    | "street_address"
    | "postal_code"
    | "municipality"
    | "title"
    | "description"
  >,
): AddressIntelligence {
  const blob = [property.title, property.address, property.description]
    .filter(Boolean)
    .join(" ");
  const farm = extractFarmSignals(blob);

  return {
    province: normalizeProvince(property.province) ?? property.province?.trim() ?? null,
    town: cleanTownish(property.town),
    suburb: cleanTownish(property.suburb),
    street: property.street_address?.trim() || property.address?.trim() || null,
    farmName: farm.farmName,
    farmNumber: farm.farmNumber,
    erfNumber: farm.erfNumber,
    portion: farm.portion,
    municipality: property.municipality?.trim() || null,
    ward: null, // Never invent wards
    postalCode: property.postal_code?.trim() || null,
  };
}

export function enrichGpsIntelligence(
  property: Pick<
    Property,
    "latitude" | "longitude" | "municipality" | "region"
  >,
): GpsIntelligence {
  const lat =
    typeof property.latitude === "number" && Number.isFinite(property.latitude)
      ? property.latitude
      : null;
  const lng =
    typeof property.longitude === "number" && Number.isFinite(property.longitude)
      ? property.longitude
      : null;
  const hasVerifiedCoordinates = lat != null && lng != null;

  return {
    latitude: hasVerifiedCoordinates ? lat : null,
    longitude: hasVerifiedCoordinates ? lng : null,
    municipality: property.municipality?.trim() || null,
    region: property.region?.trim() || null,
    hasVerifiedCoordinates,
    areaBoundary: null,
  };
}

function simpleHash(parts: string[]): string {
  const s = parts.join("|");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `e${Math.abs(h).toString(16)}`;
}

/**
 * Full enrichment snapshot for a listing. Pure — no DB writes.
 * Callers persist only when enrichmentHash differs from stored hash.
 */
export function enrichVerifiedListing(property: Property): EnrichmentResult {
  const address = enrichAddressIntelligence(property);
  const gps = enrichGpsIntelligence(property);
  const classified = classifyPropertyType({
    propertyType: property.property_type,
    title: property.title,
    description: property.description,
  });
  const propertyType = classified;
  const propertyTypeChanged =
    Boolean(propertyType) &&
    propertyType !== "Other" &&
    property.property_type?.trim() !== propertyType;

  const ag = property.agricultural_details as
    | { total_hectares?: number | null; land_size_text?: string | null }
    | null
    | undefined;

  const land = normalizeLandExtent({
    erfSize: property.erf_size,
    landSizeText: ag?.land_size_text ?? null,
    agriculturalHectares:
      typeof ag?.total_hectares === "number" ? ag.total_hectares : null,
  });

  const enrichmentHash = simpleHash([
    address.province ?? "",
    address.town ?? "",
    address.suburb ?? "",
    address.street ?? "",
    propertyType ?? "",
    String(land.squareMetres ?? ""),
    String(gps.latitude ?? ""),
    String(gps.longitude ?? ""),
    property.updated_at ?? "",
  ]);

  return {
    address,
    gps,
    propertyType,
    propertyTypeChanged,
    land,
    enrichmentHash,
  };
}
