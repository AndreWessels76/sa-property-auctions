import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import { avg } from "@/lib/platform/statsMath";
import type { Property } from "@/lib/types/property";

/**
 * Agency Intelligence — profiles from verified data only.
 * No fabricated rankings.
 */

export type AgencyIntelligenceProfile = {
  agencyName: string;
  activeListings: number;
  upcomingAuctions: number;
  completedAuctions: number;
  verificationRate: number | null;
  averageListingQuality: number | null;
  lastImport: string | null;
  coverage: {
    provinces: Record<string, number>;
    towns: Record<string, number>;
  };
  sampleNotes: string[];
};

function agencyKey(p: Property): string | null {
  const name = (p.auction_agency || p.source_name || "").trim();
  return name || null;
}

export function buildAgencyIntelligence(
  agencyName: string,
  rows: Property[],
  now = new Date(),
): AgencyIntelligenceProfile {
  const notes: string[] = [];
  const needle = agencyName.trim().toLowerCase();
  const mine = rows.filter((p) => agencyKey(p)?.toLowerCase() === needle);

  const active = mine.filter((p) =>
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
      now,
    }),
  );

  const completed = mine.filter((p) => {
    const state = normalizeVerificationState(p.verification_state);
    return state === "sold" || state === "expired" || state === "withdrawn";
  });

  const verifiedish = mine.filter((p) => {
    const state = normalizeVerificationState(p.verification_state);
    return (
      state === "verified" ||
      state === "sold" ||
      state === "expired" ||
      state === "withdrawn"
    );
  });

  const verificationRate =
    mine.length === 0
      ? null
      : Math.round((verifiedish.length / mine.length) * 1000) / 10;

  const qualities = mine
    .map((p) => p.data_quality_score ?? p.completeness_score)
    .filter((n): n is number => typeof n === "number");

  const lastImport =
    mine
      .map((p) => p.imported_at || p.created_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  const provinces: Record<string, number> = {};
  const towns: Record<string, number> = {};
  for (const p of verifiedish) {
    if (p.province?.trim()) {
      provinces[p.province] = (provinces[p.province] ?? 0) + 1;
    }
    if (p.town?.trim()) {
      towns[p.town] = (towns[p.town] ?? 0) + 1;
    }
  }

  if (qualities.length === 0) {
    notes.push("Average listing quality withheld — no quality scores stored.");
  }

  return {
    agencyName,
    activeListings: active.length,
    upcomingAuctions: active.length,
    completedAuctions: completed.length,
    verificationRate,
    averageListingQuality: avg(qualities),
    lastImport,
    coverage: { provinces, towns },
    sampleNotes: notes,
  };
}

export function buildAllAgencyIntelligence(
  rows: Property[],
  now = new Date(),
): AgencyIntelligenceProfile[] {
  const names = new Set<string>();
  for (const p of rows) {
    const k = agencyKey(p);
    if (k) names.add(k);
  }
  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => buildAgencyIntelligence(name, rows, now));
}
