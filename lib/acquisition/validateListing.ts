import type { ExtractedListing, ValidationResult } from "@/lib/acquisition/types";

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

export const ALLOWED_PROPERTY_TYPES = [
  "House",
  "Apartment",
  "Townhouse",
  "Vacant Land",
  "Commercial",
  "Industrial",
  "Farm",
  "Other",
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

export function normalizePropertyType(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  if (/house|dwelling|home|residence|guesthouse|guest\s*house/.test(v)) return "House";
  if (/apartment|flat|unit/.test(v)) return "Apartment";
  if (/townhouse|simplex|duplex|cluster/.test(v)) return "Townhouse";
  if (/vacant|stand|plot|erf|land/.test(v) && !/farm/.test(v)) return "Vacant Land";
  if (/commercial|office|retail/.test(v)) return "Commercial";
  if (/industrial|warehouse/.test(v)) return "Industrial";
  if (/farm|smallholding|agricultural|guest\s*farm/.test(v)) return "Farm";
  for (const t of ALLOWED_PROPERTY_TYPES) {
    if (t.toLowerCase() === v) return t;
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
