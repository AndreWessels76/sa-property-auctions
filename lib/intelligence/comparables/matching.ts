/**
 * Comparable matching signals — location, type, size.
 */

import { isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { ComparableIntelligenceConfig } from "./config";

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function compatiblePropertyTypes(
  subject: string | null,
  candidate: string | null,
): { match: boolean; exact: boolean } {
  if (!subject || !candidate) return { match: false, exact: false };
  if (subject === candidate) return { match: true, exact: true };

  const residential = new Set(["House", "Apartment", "Townhouse", "Cluster", "Duet"]);
  const land = new Set(["Vacant Land", "Smallholding"]);
  const agri = new Set(["Farm", "Agricultural Land", "Smallholding"]);

  if (residential.has(subject) && residential.has(candidate)) {
    return { match: true, exact: false };
  }
  if (land.has(subject) && land.has(candidate)) return { match: true, exact: false };
  if (agri.has(subject) && agri.has(candidate)) return { match: true, exact: false };

  return { match: false, exact: false };
}

export function sizeWithinTolerance(
  subject: number | null,
  candidate: number | null,
  tolerancePct: number,
): boolean {
  if (!isValidPositiveArea(subject) || !isValidPositiveArea(candidate)) return false;
  const ratio = candidate / subject;
  const low = 1 - tolerancePct / 100;
  const high = 1 + tolerancePct / 100;
  return ratio >= low && ratio <= high;
}

export function collectLocationSignals(
  subject: HistoricalEventObservation,
  candidate: HistoricalEventObservation,
  config: ComparableIntelligenceConfig,
  coords?: {
    subjectLat: number | null;
    subjectLon: number | null;
    candidateLat: number | null;
    candidateLon: number | null;
  },
): { signals: string[]; distanceKm: number | null } {
  const signals: string[] = [];
  let distanceKm: number | null = null;

  if (
    subject.suburb &&
    candidate.suburb &&
    subject.suburb.toLowerCase() === candidate.suburb.toLowerCase()
  ) {
    signals.push("Same suburb");
  }
  if (subject.town && candidate.town && subject.town.toLowerCase() === candidate.town.toLowerCase()) {
    signals.push("Same town");
  }
  if (
    subject.municipality &&
    candidate.municipality &&
    subject.municipality.toLowerCase() === candidate.municipality.toLowerCase()
  ) {
    signals.push("Same municipality");
  }
  if (
    subject.province &&
    candidate.province &&
    subject.province.toLowerCase() === candidate.province.toLowerCase()
  ) {
    signals.push("Same province");
  }

  if (
    coords?.subjectLat != null &&
    coords.subjectLon != null &&
    coords.candidateLat != null &&
    coords.candidateLon != null
  ) {
    distanceKm = haversineKm(
      coords.subjectLat,
      coords.subjectLon,
      coords.candidateLat,
      coords.candidateLon,
    );
    if (distanceKm <= config.maxDistanceKm) {
      signals.push(`Within ${Math.round(distanceKm)} km`);
    }
  }

  return { signals, distanceKm };
}

export function minimumMatchingSignals(subject: HistoricalEventObservation): number {
  const hasLocation = Boolean(subject.suburb || subject.town);
  const hasType = subject.propertyTypeStatus === "known" && Boolean(subject.propertyType);
  if (hasLocation && hasType) return 2;
  return 3;
}
