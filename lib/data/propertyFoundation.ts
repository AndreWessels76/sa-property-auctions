/**
 * Production data classification for listings.
 * Seed/demo must never be presented as verified production inventory.
 */
export type DataClassification =
  | "production"
  | "needs_verification"
  | "seed"
  | "demo";

export type ListingStatus =
  | "upcoming"
  | "live"
  | "sold"
  | "withdrawn"
  | "cancelled"
  | "completed";

export type AddressDisplayMode = "full" | "suburb_only" | "withheld";

export type FieldClass =
  | "required"
  | "optional"
  | "derived"
  | "computed"
  | "seed_only";

/** Canonical field catalogue for PROPERTY_DATA_STANDARD.md / runtime checks. */
export const PROPERTY_FIELD_CATALOGUE: Array<{
  key: string;
  label: string;
  classification: FieldClass;
  notes: string;
}> = [
  { key: "id", label: "Property ID", classification: "required", notes: "UUID primary key" },
  { key: "title", label: "Title", classification: "required", notes: "Public listing title" },
  { key: "description", label: "Description", classification: "optional", notes: "May be withheld" },
  { key: "address", label: "Full Address", classification: "optional", notes: "May be suburb-only legally" },
  { key: "street_address", label: "Street Address", classification: "optional", notes: "Foundation column" },
  { key: "suburb", label: "Suburb", classification: "required", notes: "Minimum public location" },
  { key: "town", label: "Town", classification: "required", notes: "" },
  { key: "province", label: "Province", classification: "required", notes: "" },
  { key: "postal_code", label: "Postal Code", classification: "optional", notes: "" },
  { key: "country", label: "Country", classification: "optional", notes: "Default South Africa" },
  { key: "latitude", label: "Latitude", classification: "optional", notes: "Null until verified" },
  { key: "longitude", label: "Longitude", classification: "optional", notes: "Null until verified" },
  { key: "municipality", label: "Municipality", classification: "optional", notes: "Geo foundation" },
  { key: "region", label: "Region", classification: "optional", notes: "Geo foundation" },
  { key: "property_type", label: "Property Type", classification: "required", notes: "" },
  { key: "bedrooms", label: "Bedrooms", classification: "optional", notes: "N/A for land/commercial" },
  { key: "bathrooms", label: "Bathrooms", classification: "optional", notes: "" },
  { key: "garages", label: "Garages", classification: "optional", notes: "" },
  { key: "erf_size", label: "Land Size", classification: "optional", notes: "Maps to erf_size" },
  { key: "floor_size", label: "Building Size", classification: "optional", notes: "Maps to floor_size" },
  { key: "estimated_value", label: "Estimated Value", classification: "optional", notes: "Never invent" },
  { key: "auction_price", label: "Auction Price", classification: "optional", notes: "Guide/asking" },
  { key: "reserve_price", label: "Reserve Price", classification: "optional", notes: "Often confidential" },
  { key: "auction_date", label: "Auction Date", classification: "required", notes: "" },
  { key: "auction_time", label: "Auction Time", classification: "optional", notes: "" },
  { key: "auction_venue", label: "Auction Venue", classification: "optional", notes: "" },
  { key: "auction_agency", label: "Auction Agency", classification: "required", notes: "Or explicit unknown" },
  { key: "agency_contact", label: "Agency Contact", classification: "optional", notes: "" },
  { key: "agency_website", label: "Agency Website", classification: "optional", notes: "" },
  { key: "source_name", label: "Source Name", classification: "required", notes: "Provenance" },
  { key: "source_url", label: "Source URL", classification: "optional", notes: "Traceable when public" },
  { key: "external_listing_id", label: "External Listing ID", classification: "optional", notes: "Dedup key" },
  { key: "imported_at", label: "Imported Date", classification: "required", notes: "Defaults to created_at" },
  { key: "last_verified_at", label: "Last Verified", classification: "optional", notes: "Null = unverified" },
  { key: "listing_status", label: "Listing Status", classification: "required", notes: "Canonical enum" },
  { key: "status", label: "Legacy Status", classification: "derived", notes: "Map to listing_status" },
  { key: "created_at", label: "Created", classification: "required", notes: "" },
  { key: "updated_at", label: "Updated", classification: "required", notes: "" },
  { key: "data_classification", label: "Data Classification", classification: "required", notes: "seed|demo|…" },
  { key: "verification_state", label: "Verification State", classification: "required", notes: "seed|pending_verification|verified|…" },
  { key: "data_quality_score", label: "Quality Score", classification: "computed", notes: "0–100 admin-only overall" },
  { key: "source", label: "Legacy Source", classification: "derived", notes: "Compat string" },
];

export function normalizeListingStatus(
  value: string | null | undefined,
): ListingStatus | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "upcoming") return "upcoming";
  if (v === "live" || v === "active") return "live";
  if (v === "sold") return "sold";
  if (v === "withdrawn") return "withdrawn";
  if (v === "cancelled" || v === "canceled") return "cancelled";
  if (v === "completed" || v === "closed") return "completed";
  return null;
}

export function formatListingStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeListingStatus(status) ?? status?.trim();
  if (!normalized) return "Status not listed";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function isSeedOrDemo(
  classification: string | null | undefined,
  source?: string | null,
): boolean {
  const c = (classification ?? "").toLowerCase();
  if (c === "seed" || c === "demo") return true;
  const s = (source ?? "").toUpperCase();
  return s.includes("SEED DATA") || s.includes("[SEED]") || s.startsWith("SEED ·");
}
