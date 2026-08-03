import { verifyAddressFields } from "@/lib/data/addressVerification";
import { verifyAuctionFields } from "@/lib/data/auctionVerification";
import { resolveAuctionAgency } from "@/lib/auction/agencyDisplay";
import type { Property } from "@/lib/types/property";

export type VerificationChecklist = {
  address: boolean;
  images: boolean;
  agency: boolean;
  auctionDate: boolean;
  propertyMetadata: boolean;
  source: boolean;
  qualityScore: number;
  readyToApprove: boolean;
  missing: string[];
};

export function buildVerificationChecklist(
  property: Property,
  hasImages: boolean,
  overallQualityScore: number,
): VerificationChecklist {
  const address = verifyAddressFields({
    street: property.street_address,
    address: property.address,
    suburb: property.suburb,
    town: property.town,
    province: property.province,
    postalCode: property.postal_code,
    latitude: property.latitude,
    longitude: property.longitude,
  });
  const agency = resolveAuctionAgency(property.source);
  const auction = verifyAuctionFields({
    auctionAgency: property.auction_agency,
    contactNumber: property.agency_contact,
    website: property.agency_website,
    auctionDate: property.auction_date,
    auctionTime: property.auction_time,
    venue: property.auction_venue,
    sourceDerivedAgency: agency.name,
  });

  const missing: string[] = [];
  const addressOk = address.complete;
  if (!addressOk) missing.push("address");
  if (!hasImages) missing.push("images");
  if (!auction.auctionAgency) missing.push("agency");
  if (!property.auction_date) missing.push("auction_date");
  const metadataOk = Boolean(property.property_type && property.title);
  if (!metadataOk) missing.push("property_metadata");
  const sourceOk = Boolean(property.source_url || property.source_name);
  if (!sourceOk) missing.push("source");

  const readyToApprove =
    addressOk &&
    hasImages &&
    Boolean(auction.auctionAgency) &&
    Boolean(property.auction_date) &&
    metadataOk &&
    sourceOk &&
    overallQualityScore >= 50;

  return {
    address: addressOk,
    images: hasImages,
    agency: Boolean(auction.auctionAgency),
    auctionDate: Boolean(property.auction_date),
    propertyMetadata: metadataOk,
    source: sourceOk,
    qualityScore: overallQualityScore,
    readyToApprove,
    missing,
  };
}
