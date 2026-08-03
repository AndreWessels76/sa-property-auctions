import type { ExtractedListing, ValidationResult } from "@/lib/acquisition/types";
import {
  classifyPropertyType,
  PLATFORM_PROPERTY_TYPES,
  propertyTypeSearchBucket,
} from "@/lib/platform/propertyClassification";

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
] as const;

/** Catalogue search buckets + fine-grained platform types. */
export const ALLOWED_PROPERTY_TYPES = [
  "House",
  "Apartment",
  "Townhouse",
  "Vacant Land",
  "Commercial",
  "Industrial",
  "Farm",
  "Other",
  ...PLATFORM_PROPERTY_TYPES.filter(
    (t) =>
      ![
        "House",
        "Apartment",
        "Townhouse",
        "Vacant Land",
        "Commercial",
        "Industrial",
        "Farm",
        "Other",
      ].includes(t),
  ),
] as const;

export function normalizeProvince(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  for (const p of SA_PROVINCES) {
    if (p.toLowerCase() === v) return p;
    // Common aliases
    if (v === "kwaZulu natal".toLowerCase() || v === "kzn") return "KwaZulu-Natal";
    if (v === "north-west" || v === "northwest") return "North West";
  }
  // Fuzzy contains
  for (const p of SA_PROVINCES) {
    if (v.includes(p.toLowerCase()) || p.toLowerCase().includes(v)) return p;
  }
  return null;
}

/**
 * Prefer specific platform types. "Other" only when no signal matches.
 */
export function normalizePropertyType(
  value: string | null | undefined,
  context?: { title?: string | null; description?: string | null },
): string | null {
  if (!value?.trim() && !context?.title?.trim() && !context?.description?.trim()) {
    return null;
  }
  const classified = classifyPropertyType({
    propertyType: value,
    title: context?.title,
    description: context?.description,
  });
  if (!classified) return null;
  // Persist fine-grained type; search can bucket via propertyTypeSearchBucket.
  if (classified !== "Other") return classified;
  // Last resort: keep raw non-empty unknown labels rather than forcing Other when
  // the source already said something specific we couldn't map.
  if (value?.trim() && !/^other$/i.test(value.trim())) {
    return propertyTypeSearchBucket(value);
  }
  return "Other";
}

/**
 * Reject incomplete/invalid listings. Never silently discard — caller must store reason.
 */
export function validateExtractedListing(
  listing: ExtractedListing,
  options?: { duplicateExternalId?: boolean; pageBroken?: boolean },
): ValidationResult {
  if (!listing.sourceUrl?.trim()) {
    return { ok: false, reason: "Missing source URL" };
  }
  if (!listing.title?.trim()) {
    return { ok: false, reason: "Missing title" };
  }
  if (!listing.auctionDate?.trim()) {
    return { ok: false, reason: "Missing auction date" };
  }
  if (options?.pageBroken) {
    return { ok: false, reason: "Broken property page" };
  }
  if (options?.duplicateExternalId) {
    return { ok: false, reason: "Duplicate external ID pending merge path" };
  }
  if (!listing.externalListingId?.trim()) {
    return { ok: false, reason: "Missing external listing ID" };
  }
  if (!listing.province?.trim()) {
    return { ok: false, reason: "Missing province" };
  }
  const province = normalizeProvince(listing.province);
  if (!province) {
    return { ok: false, reason: `Invalid province: ${listing.province}` };
  }
  if (!listing.town?.trim() && !listing.suburb?.trim()) {
    return { ok: false, reason: "Missing town/suburb" };
  }
  if (listing.propertyType) {
    const type = normalizePropertyType(listing.propertyType);
    if (!type || (type === "Other" && !/other/i.test(listing.propertyType))) {
      // "Other" is allowed as normalized catch-all for unknown but present types
    }
  }
  // Corrupt images: empty URL strings
  if (listing.imageUrls.some((u) => !u || !/^https?:\/\//i.test(u))) {
    return { ok: false, reason: "Corrupt images" };
  }
  return { ok: true };
}
