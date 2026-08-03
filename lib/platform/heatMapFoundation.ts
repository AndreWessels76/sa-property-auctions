import { calculateDensity } from "@/lib/heatmap/densityCalculator";
import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import { monthKey } from "@/lib/platform/statsMath";
import type { Property } from "@/lib/types/property";

/**
 * Heat Map Foundation — density datasets only (no rendering).
 */

export type HeatDensityCell = {
  key: string;
  label: string;
  count: number;
  density: number;
};

export type HeatMapFoundationDatasets = {
  generatedAt: string;
  radiusKm: number;
  auctionDensity: HeatDensityCell[];
  agencyDensity: HeatDensityCell[];
  propertyDensity: HeatDensityCell[];
  verifiedDensity: HeatDensityCell[];
  priceDensity: HeatDensityCell[];
  timeDensity: HeatDensityCell[];
  notes: string[];
};

function cell(
  key: string,
  label: string,
  count: number,
  radiusKm: number,
): HeatDensityCell {
  return {
    key,
    label,
    count,
    density: calculateDensity(count, radiusKm),
  };
}

function tally(
  map: Map<string, { label: string; count: number }>,
  key: string,
  label: string,
) {
  const cur = map.get(key) ?? { label, count: 0 };
  cur.count += 1;
  map.set(key, cur);
}

function toCells(
  map: Map<string, { label: string; count: number }>,
  radiusKm: number,
): HeatDensityCell[] {
  return [...map.entries()]
    .map(([key, v]) => cell(key, v.label, v.count, radiusKm))
    .sort((a, b) => b.count - a.count);
}

export function buildHeatMapFoundationDatasets(
  rows: Property[],
  options?: { radiusKm?: number; now?: Date },
): HeatMapFoundationDatasets {
  const radiusKm = options?.radiusKm ?? 25;
  const now = options?.now ?? new Date();
  const notes: string[] = [];

  const auction = new Map<string, { label: string; count: number }>();
  const agency = new Map<string, { label: string; count: number }>();
  const property = new Map<string, { label: string; count: number }>();
  const verified = new Map<string, { label: string; count: number }>();
  const price = new Map<string, { label: string; count: number }>();
  const time = new Map<string, { label: string; count: number }>();

  let priced = 0;

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

    const town = p.town?.trim() || "Unknown town";
    const townKey = town.toLowerCase();
    tally(auction, townKey, town);
    tally(property, (p.property_type || "Unknown").toLowerCase(), p.property_type || "Unknown");

    if (state === "verified") {
      tally(verified, townKey, town);
    }

    const agencyName = (p.auction_agency || p.source_name || "").trim();
    if (agencyName) {
      tally(agency, agencyName.toLowerCase(), agencyName);
    }

    if (typeof p.auction_price === "number" && p.auction_price > 0) {
      priced += 1;
      const band =
        p.auction_price < 500_000
          ? "< R500k"
          : p.auction_price < 1_500_000
            ? "R500k–R1.5m"
            : p.auction_price < 5_000_000
              ? "R1.5m–R5m"
              : "R5m+";
      tally(price, band, band);
    }

    const m = monthKey(p.auction_date);
    if (m) tally(time, m, m);

    // Active auctions contribute to auction density emphasis via same town tally;
    // historical still count for overall density (spec: prepare datasets).
    void isPubliclyActiveListing;
  }

  if (priced === 0) {
    notes.push("Price density empty — no auction prices on eligible rows.");
  }
  if (verified.size === 0) {
    notes.push("Verified density empty — no verified rows in corpus.");
  }

  return {
    generatedAt: now.toISOString(),
    radiusKm,
    auctionDensity: toCells(auction, radiusKm),
    agencyDensity: toCells(agency, radiusKm),
    propertyDensity: toCells(property, radiusKm),
    verifiedDensity: toCells(verified, radiusKm),
    priceDensity: toCells(price, radiusKm),
    timeDensity: toCells(time, radiusKm),
    notes,
  };
}
