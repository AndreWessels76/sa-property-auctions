import { resolveAuctionAgency } from "@/lib/auction/agencyDisplay";
import {
  isSeedOrDemo,
  normalizeListingStatus,
  type DataClassification,
} from "@/lib/data/propertyFoundation";

export type PropertyQualityInput = {
  title?: string | null;
  description?: string | null;
  address?: string | null;
  street_address?: string | null;
  suburb?: string | null;
  town?: string | null;
  province?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  estimated_value?: number | null;
  auction_price?: number | null;
  auction_date?: string | null;
  auction_agency?: string | null;
  agency_website?: string | null;
  source?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  external_listing_id?: string | null;
  imported_at?: string | null;
  last_verified_at?: string | null;
  listing_status?: string | null;
  status?: string | null;
  data_classification?: string | null;
  hasImages?: boolean;
};

export type PropertyQualityResult = {
  score: number;
  classification: DataClassification;
  issues: string[];
  missingRequired: string[];
};

/**
 * Deterministic 0–100 quality score. Does not invent values.
 */
export function scorePropertyQuality(
  input: PropertyQualityInput,
): PropertyQualityResult {
  const issues: string[] = [];
  const missingRequired: string[] = [];
  let score = 0;

  const agency =
    input.auction_agency?.trim() ||
    resolveAuctionAgency(input.source).name ||
    input.source_name?.trim() ||
    null;
  const sourceName = input.source_name?.trim() || agency;
  const sourceUrl =
    input.source_url?.trim() ||
    resolveAuctionAgency(input.source).website ||
    null;

  const checks: Array<{ ok: boolean; points: number; missing?: string; issue?: string }> = [
    { ok: Boolean(input.title?.trim()), points: 8, missing: "title" },
    { ok: Boolean(input.town?.trim()), points: 8, missing: "town" },
    { ok: Boolean(input.province?.trim()), points: 8, missing: "province" },
    { ok: Boolean(input.suburb?.trim()), points: 6, missing: "suburb", issue: "Suburb missing" },
    {
      ok: Boolean(input.address?.trim() || input.street_address?.trim()),
      points: 6,
      issue: "Street/full address missing",
    },
    { ok: Boolean(input.property_type?.trim()), points: 6, missing: "property_type" },
    { ok: Boolean(input.auction_date), points: 8, missing: "auction_date" },
    {
      ok: Boolean(normalizeListingStatus(input.listing_status ?? input.status)),
      points: 6,
      issue: "Listing status not canonical",
    },
    { ok: Boolean(sourceName), points: 10, missing: "source_name / agency" },
    { ok: Boolean(sourceUrl), points: 6, issue: "Source URL missing" },
    {
      ok: Boolean(input.external_listing_id?.trim()),
      points: 4,
      issue: "External listing ID missing",
    },
    {
      ok: Boolean(input.imported_at),
      points: 4,
      issue: "Imported timestamp missing",
    },
    {
      ok: Boolean(input.last_verified_at),
      points: 6,
      issue: "Not verified against source",
    },
    {
      ok: input.latitude != null && input.longitude != null,
      points: 4,
      issue: "Coordinates not verified",
    },
    {
      ok: (input.estimated_value ?? 0) > 0,
      points: 3,
      issue: "Estimated value missing",
    },
    {
      ok: (input.auction_price ?? 0) > 0,
      points: 3,
      issue: "Auction price missing",
    },
    { ok: Boolean(input.hasImages), points: 4, issue: "No gallery images" },
  ];

  for (const check of checks) {
    if (check.ok) {
      score += check.points;
    } else {
      if (check.missing) missingRequired.push(check.missing);
      if (check.issue) issues.push(check.issue);
      else if (check.missing) issues.push(`Missing ${check.missing}`);
    }
  }

  let classification: DataClassification = "needs_verification";
  if (isSeedOrDemo(input.data_classification, input.source)) {
    classification = (input.data_classification as DataClassification) || "seed";
    if (classification !== "demo") classification = "seed";
    issues.unshift("Classified as seed/demo — not a verified production listing");
  } else if (
    sourceName &&
    input.last_verified_at &&
    input.auction_date &&
    input.town &&
    input.province &&
    score >= 70
  ) {
    classification = "production";
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    classification,
    issues,
    missingRequired,
  };
}
