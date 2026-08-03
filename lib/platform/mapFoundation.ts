import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import type { Property } from "@/lib/types/property";

/**
 * Interactive Maps Foundation — prepare point data only (no UI redesign).
 */

export type MapFoundationPoint = {
  id: string;
  latitude: number;
  longitude: number;
  province: string | null;
  town: string | null;
  suburb: string | null;
  propertyType: string | null;
  verificationState: string | null;
  listingActive: boolean;
  /** Reserved for polygon joins — null until boundaries ingested. */
  boundaryId: null;
};

export type MapFoundationDataset = {
  generatedAt: string;
  pointCount: number;
  missingCoordinates: number;
  points: MapFoundationPoint[];
};

export function buildMapFoundationDataset(
  rows: Property[],
  now = new Date(),
): MapFoundationDataset {
  const points: MapFoundationPoint[] = [];
  let missingCoordinates = 0;

  for (const p of rows) {
    const state = normalizeVerificationState(p.verification_state);
    if (
      state !== "verified" &&
      state !== "sold" &&
      state !== "expired" &&
      state !== "withdrawn"
    ) {
      continue;
    }

    const lat = p.latitude;
    const lng = p.longitude;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      missingCoordinates += 1;
      continue;
    }

    points.push({
      id: p.id,
      latitude: lat,
      longitude: lng,
      province: p.province ?? null,
      town: p.town ?? null,
      suburb: p.suburb ?? null,
      propertyType: p.property_type ?? null,
      verificationState: state,
      listingActive: isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
        now,
      }),
      boundaryId: null,
    });
  }

  return {
    generatedAt: now.toISOString(),
    pointCount: points.length,
    missingCoordinates,
    points,
  };
}
