import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import type { Property } from "@/lib/types/property";

/**
 * Data freshness + acquisition quality monitoring (deterministic).
 */

export type FreshnessRecord = {
  propertyId: string;
  title: string | null;
  lastImported: string | null;
  lastVerified: string | null;
  daysSinceUpdate: number | null;
  daysUntilAuction: number | null;
  stale: boolean;
  expiredActive: boolean;
};

export type AcquisitionQualityMonitor = {
  generatedAt: string;
  sampleSize: number;
  missingImages: number;
  missingGps: number;
  missingAuctionDates: number;
  missingAgency: number;
  invalidAddresses: number;
  invalidCoordinates: number;
  expiredListings: number;
  staleListings: number;
  brokenDocumentHints: number;
  freshness: FreshnessRecord[];
};

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

export function buildAcquisitionQualityMonitor(
  rows: Property[],
  options?: { staleDays?: number; now?: Date },
): AcquisitionQualityMonitor {
  const now = options?.now ?? new Date();
  const staleDays = options?.staleDays ?? 45;
  let missingImages = 0;
  let missingGps = 0;
  let missingAuctionDates = 0;
  let missingAgency = 0;
  let invalidAddresses = 0;
  let invalidCoordinates = 0;
  let expiredListings = 0;
  let staleListings = 0;
  let brokenDocumentHints = 0;
  const freshness: FreshnessRecord[] = [];

  for (const p of rows) {
    const state = normalizeVerificationState(p.verification_state);
    if (!state) continue;

    const hasImages = Boolean(
      p.hero_image || p.image || p.thumbnail || p.medium_image,
    );
    // Listing rows may have gallery in property_images — treat missing hero as hint only
    if (!hasImages) missingImages += 1;

    const hasGps =
      typeof p.latitude === "number" &&
      typeof p.longitude === "number" &&
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude);
    if (!hasGps) missingGps += 1;
    else if (
      p.latitude! < -35 ||
      p.latitude! > -22 ||
      p.longitude! < 16 ||
      p.longitude! > 33
    ) {
      invalidCoordinates += 1;
    }

    if (!p.auction_date) missingAuctionDates += 1;
    if (!p.auction_agency?.trim() && !p.source_name?.trim()) missingAgency += 1;

    if (
      !p.town?.trim() ||
      !p.province?.trim() ||
      /electricity|click here|viewing/i.test(p.town ?? "")
    ) {
      invalidAddresses += 1;
    }

    for (const link of [p.brochure_link, p.terms_link, p.catalogue_link, p.source_url]) {
      if (link && !/^https?:\/\//i.test(link)) brokenDocumentHints += 1;
    }

    const lastTouch = p.updated_at || p.imported_at || p.created_at;
    const lastDate = lastTouch ? new Date(lastTouch) : null;
    const daysSinceUpdate =
      lastDate && !Number.isNaN(lastDate.getTime())
        ? daysBetween(now, lastDate)
        : null;
    const stale = daysSinceUpdate != null && daysSinceUpdate > staleDays;
    if (stale) staleListings += 1;

    let daysUntilAuction: number | null = null;
    if (p.auction_date) {
      const ad = new Date(p.auction_date);
      if (!Number.isNaN(ad.getTime())) daysUntilAuction = daysBetween(ad, now);
    }

    const expiredActive =
      state === "verified" &&
      !isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
        now,
      });
    if (expiredActive) expiredListings += 1;

    freshness.push({
      propertyId: p.id,
      title: p.title,
      lastImported: p.imported_at ?? null,
      lastVerified: p.last_verified_at ?? null,
      daysSinceUpdate,
      daysUntilAuction,
      stale,
      expiredActive,
    });
  }

  return {
    generatedAt: now.toISOString(),
    sampleSize: rows.length,
    missingImages,
    missingGps,
    missingAuctionDates,
    missingAgency,
    invalidAddresses,
    invalidCoordinates,
    expiredListings,
    staleListings,
    brokenDocumentHints,
    freshness: freshness.filter((f) => f.stale || f.expiredActive).slice(0, 100),
  };
}
