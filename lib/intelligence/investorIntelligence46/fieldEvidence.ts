/**
 * Field-level evidence for live property listings (II 4.6).
 */

import { buildSaleEvidence } from "@/lib/intelligence/comparables/saleEvidence";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { Property } from "@/lib/types/property";
import type { FieldEvidence, FieldEvidenceStatus } from "./types";

function fe(
  field: string,
  value: string | number | boolean | null,
  status: FieldEvidenceStatus,
  source: string | null,
  sourceUrl: string | null,
  observedAt: string | null,
  confidence: string | null,
  approximate?: boolean,
): FieldEvidence {
  return { field, value, status, source, sourceUrl, observedAt, confidence, approximate };
}

function hasPositive(n: number | null | undefined): boolean {
  return n != null && Number.isFinite(n) && n > 0;
}

export function buildPropertyIdentityFields(
  property: Property,
  observation?: HistoricalEventObservation | null,
): FieldEvidence[] {
  const source = property.source_name ?? property.auction_agency ?? null;
  const sourceUrl = property.source_url ?? observation?.sourceUrl ?? null;
  const observedAt = property.last_verified_at ?? property.imported_at ?? null;

  return [
    fe(
      "propertyMasterId",
      property.property_master_id ?? observation?.propertyMasterId ?? null,
      property.property_master_id || observation?.propertyMasterId
        ? property.verification_state === "verified"
          ? "VERIFIED"
          : "SOURCE_CONFIRMED"
        : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      property.property_master_id ? "HIGH" : "INSUFFICIENT_DATA",
    ),
    fe(
      "address",
      property.address ?? property.street_address ?? null,
      property.address || property.street_address ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      property.address ? "MEDIUM" : null,
    ),
    fe(
      "town",
      property.town ?? null,
      property.town ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      property.town ? "HIGH" : null,
    ),
    fe(
      "suburb",
      property.suburb ?? null,
      property.suburb ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      property.suburb ? "MEDIUM" : null,
    ),
    fe(
      "agency",
      property.auction_agency ?? property.source_name ?? null,
      property.auction_agency || property.source_name ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      "MEDIUM",
    ),
    fe(
      "sourceUrl",
      sourceUrl,
      sourceUrl ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      sourceUrl ? "HIGH" : "INSUFFICIENT_DATA",
    ),
  ];
}

export function buildPhysicalPropertyFields(property: Property): FieldEvidence[] {
  const source = property.source_name ?? property.auction_agency ?? null;
  const sourceUrl = property.source_url ?? null;
  const observedAt = property.last_verified_at ?? property.imported_at ?? null;
  const ha = property.agricultural_details?.totalHectares ?? null;
  const haApprox = false;

  return [
    fe(
      "propertyType",
      property.property_type ?? null,
      property.property_type ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      "MEDIUM",
    ),
    fe(
      "bedrooms",
      property.bedrooms ?? null,
      property.bedrooms != null ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      "LOW",
    ),
    fe(
      "bathrooms",
      property.bathrooms ?? null,
      property.bathrooms != null ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      "LOW",
    ),
    fe(
      "garages",
      property.garages ?? null,
      property.garages != null ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      "LOW",
    ),
    fe(
      "floorSize",
      property.floor_size ?? null,
      hasPositive(property.floor_size) ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      hasPositive(property.floor_size) ? "MEDIUM" : null,
    ),
    fe(
      "landSize",
      property.erf_size ?? null,
      hasPositive(property.erf_size) ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      hasPositive(property.erf_size) ? "MEDIUM" : null,
    ),
    fe(
      "hectares",
      ha,
      hasPositive(ha) ? "EXTRACTED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      observedAt,
      hasPositive(ha) ? "MEDIUM" : null,
      haApprox,
    ),
  ];
}

export function buildAuctionFields(property: Property): FieldEvidence[] {
  const source = property.source_name ?? property.auction_agency ?? null;
  const sourceUrl = property.source_url ?? null;

  return [
    fe(
      "auctionDate",
      property.auction_date ?? null,
      property.auction_date ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      property.auction_date,
      property.auction_date ? "HIGH" : null,
    ),
    fe(
      "auctionStatus",
      property.listing_status ?? property.status ?? null,
      "SOURCE_CONFIRMED",
      source,
      sourceUrl,
      property.status_changed_at ?? null,
      "MEDIUM",
    ),
    fe(
      "auctionEvent",
      property.property_master_id ? "linked" : null,
      property.property_master_id ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      sourceUrl,
      null,
      property.property_master_id ? "MEDIUM" : "INSUFFICIENT_DATA",
    ),
  ];
}

export function buildPricingFields(
  property: Property,
  observation?: HistoricalEventObservation | null,
): FieldEvidence[] {
  const source = property.source_name ?? property.auction_agency ?? null;
  const sourceUrl = property.source_url ?? null;
  const sale = observation ? buildSaleEvidence(observation) : null;

  const priceField = (
    field: string,
    value: number | null,
    verified: boolean,
  ): FieldEvidence =>
    fe(
      field,
      value,
      value == null
        ? "NOT_SUPPLIED"
        : verified
          ? "VERIFIED"
          : field === "salePrice"
            ? "NOT_SUPPLIED"
            : "SOURCE_CONFIRMED",
      source,
      sourceUrl,
      property.auction_date ?? null,
      verified ? "HIGH" : value != null ? "MEDIUM" : "INSUFFICIENT_DATA",
    );

  return [
    priceField("auctionPrice", sale?.auctionPrice ?? property.auction_price ?? null, false),
    priceField("guidePrice", sale?.guidePrice ?? null, false),
    priceField("reservePrice", sale?.reservePrice ?? property.reserve_price ?? null, false),
    priceField("startingBid", sale?.startingBid ?? null, false),
    priceField("estimatedValue", sale?.estimatedValue ?? property.estimated_value ?? null, false),
    priceField(
      "salePrice",
      sale?.verifiedSale ? (sale.salePrice ?? null) : null,
      Boolean(sale?.verifiedSale),
    ),
  ];
}
