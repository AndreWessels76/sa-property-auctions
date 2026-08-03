import type { Property } from "@/lib/types/property";

export type AcquisitionStage =
  | "discover"
  | "download"
  | "extract"
  | "normalize"
  | "validate"
  | "deduplicate"
  | "quality_score"
  | "verification_queue"
  | "admin_approval"
  | "verified_listing"
  | "public_website";

export type RawListingCandidate = {
  sourceUrl: string;
  externalListingId?: string | null;
  discoveredAt: string;
  html?: string | null;
  payload?: Record<string, unknown> | null;
};

export type ExtractedListing = {
  title: string | null;
  streetAddress: string | null;
  suburb: string | null;
  town: string | null;
  province: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  landSize: number | null;
  buildingSize: number | null;
  description: string | null;
  features: string | null;
  imageUrls: string[];
  auctionDate: string | null;
  auctionTime: string | null;
  auctionVenue: string | null;
  viewingInformation: string | null;
  depositRequirements: string | null;
  termsLink: string | null;
  brochureLink: string | null;
  registrationLink: string | null;
  sourceUrl: string;
  externalListingId: string;
  auctionAgency: string;
  agencyContact: string | null;
  agencyWebsite: string | null;
  auctionPrice: number | null;
  estimatedValue: number | null;
  listingStatus: string | null;
  contentHash: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export type AcquisitionRunOptions = {
  jobId?: string;
  /** Explicit listing URLs (manual / licensed). */
  listingUrls?: string[];
  /** Pre-extracted licensed payloads (CSV/JSON mapped). */
  licensedPayloads?: ExtractedListing[];
  /** Allow HTTP fetch of public listing pages after robots.txt allow. */
  allowPublicFetch?: boolean;
  maxListings?: number;
};

export type AcquisitionRunResult = {
  jobId: string;
  connectorId: string;
  imported: number;
  updated: number;
  rejected: number;
  archived: number;
  duplicates: number;
  errors: string[];
  durationMs: number;
  stageLog: Array<{ stage: AcquisitionStage; status: string; message: string }>;
};

export type NormalizedImportProperty = Partial<Property> & {
  title: string;
  town: string;
  province: string;
  property_type: string;
  auction_date: string;
  source_url: string;
  external_listing_id: string;
  imageUrls: string[];
};
