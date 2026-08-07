import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import { propertyTypeSearchBucket } from "@/lib/platform/propertyClassification";
import type { Property } from "@/lib/types/property";

/**
 * Geographic coverage — verified production only. Never fabricates %.
 */

export type CoverageCell = {
  key: string;
  label: string;
  total: number;
  active: number;
};

export type GeographicCoverageReport = {
  generatedAt: string;
  sampleSize: number;
  byProvince: CoverageCell[];
  byTown: CoverageCell[];
  byPropertyType: CoverageCell[];
  byAgency: CoverageCell[];
  byPartnerHint: CoverageCell[];
  gaps: string[];
};

function bump(
  map: Map<string, CoverageCell>,
  key: string,
  label: string,
  active: boolean,
) {
  const cur = map.get(key) ?? { key, label, total: 0, active: 0 };
  cur.total += 1;
  if (active) cur.active += 1;
  map.set(key, cur);
}

export function buildGeographicCoverageReport(
  rows: Property[],
  now = new Date(),
): GeographicCoverageReport {
  const provinces = new Map<string, CoverageCell>();
  const towns = new Map<string, CoverageCell>();
  const types = new Map<string, CoverageCell>();
  const agencies = new Map<string, CoverageCell>();
  const partners = new Map<string, CoverageCell>();
  const gaps: string[] = [];

  const SA_PROVINCES = [
    "Eastern Cape",
    "Free State",
    "Gauteng",
    "KwaZulu-Natal",
    "Limpopo",
    "Mpumalanga",
    "Northern Cape",
    "North West",
    "Western Cape",
  ];

  for (const p of rows) {
    const state = normalizeVerificationState(p.verification_state);
    if (state !== "verified" && state !== "sold" && state !== "expired") continue;

    const active = isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
      now,
    });

    if (p.province?.trim()) {
      bump(provinces, p.province.toLowerCase(), p.province, active);
    }
    if (p.town?.trim()) {
      bump(towns, p.town.toLowerCase(), p.town, active);
    }
    const bucket = propertyTypeSearchBucket(p.property_type);
    bump(types, bucket.toLowerCase(), bucket, active);

    const agency = (p.auction_agency || p.source_name || "Unknown").trim();
    bump(agencies, agency.toLowerCase(), agency, active);

    const partnerHint = (p.connector_id || p.source_name || "unknown").trim();
    bump(partners, partnerHint.toLowerCase(), partnerHint, active);
  }

  for (const province of SA_PROVINCES) {
    if (!provinces.has(province.toLowerCase())) {
      gaps.push(`No verified coverage in ${province}`);
    }
  }

  const sortCells = (m: Map<string, CoverageCell>) =>
    [...m.values()].sort((a, b) => b.total - a.total);

  return {
    generatedAt: now.toISOString(),
    sampleSize: rows.length,
    byProvince: sortCells(provinces),
    byTown: sortCells(towns).slice(0, 100),
    byPropertyType: sortCells(types),
    byAgency: sortCells(agencies),
    byPartnerHint: sortCells(partners),
    gaps,
  };
}

/** Coverage % only when a denominator is known (e.g. 9 provinces). */
export function provinceCoveragePercent(report: GeographicCoverageReport): number | null {
  const covered = report.byProvince.filter((c) => c.total > 0).length;
  if (covered === 0) return null;
  return Math.round((covered / 9) * 1000) / 10;
}
