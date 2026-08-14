/**
 * Deterministic comparable confidence scoring — explainable, not predictive.
 */

import { evidenceQualityBonus } from "@/lib/intelligence/historicalEvidence/scoring";
import { scoreHistoricalEvidence } from "@/lib/intelligence/historicalEvidence/scoring";
import { classifyObservation } from "@/lib/intelligence/outcomes/evidence";
import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import { COMPARABLE_WEIGHTS } from "@/lib/intelligence/outcomes/config";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { ComparableIntelligenceConfig } from "./config";
import type { ComparableConfidenceLevel, ComparableScoreBreakdown } from "./types";
import {
  collectLocationSignals,
  compatiblePropertyTypes,
  sizeWithinTolerance,
  minimumMatchingSignals,
} from "./matching";
import { buildSaleEvidence } from "./saleEvidence";

export function scoreComparable(
  subject: HistoricalEventObservation,
  candidate: HistoricalEventObservation,
  config: ComparableIntelligenceConfig,
  matchingEvidence: string[],
): { score: ComparableScoreBreakdown; confidence: ComparableConfidenceLevel } {
  const evidence = buildSaleEvidence(candidate);
  const typeCompat = compatiblePropertyTypes(subject.propertyType, candidate.propertyType);

  let location_match = 0;
  if (matchingEvidence.some((s) => s.startsWith("Same suburb"))) location_match += COMPARABLE_WEIGHTS.suburb;
  else if (matchingEvidence.some((s) => s.startsWith("Same town"))) location_match += COMPARABLE_WEIGHTS.town;
  else if (matchingEvidence.some((s) => s.startsWith("Same province"))) location_match += 10;
  if (matchingEvidence.some((s) => s.includes("km"))) location_match += COMPARABLE_WEIGHTS.distanceKm;

  const property_type_match = typeCompat.exact
    ? COMPARABLE_WEIGHTS.propertyTypeExact
    : typeCompat.match
      ? COMPARABLE_WEIGHTS.propertyTypeCompatible
      : 0;

  let size_similarity = 0;
  if (
    isValidPositiveArea(subject.floorSizeM2) &&
    sizeWithinTolerance(subject.floorSizeM2, candidate.floorSizeM2, config.floorSizeTolerancePct)
  ) {
    size_similarity = COMPARABLE_WEIGHTS.floorSize;
  }

  let land_similarity = 0;
  if (
    isValidPositiveArea(subject.hectares) &&
    sizeWithinTolerance(subject.hectares, candidate.hectares, config.hectareTolerancePct)
  ) {
    land_similarity = COMPARABLE_WEIGHTS.landHectares;
  }

  let agricultural_similarity = 0;
  if (
    subject.agriculturalSubtype &&
    candidate.agriculturalSubtype &&
    subject.agriculturalSubtype === candidate.agriculturalSubtype
  ) {
    agricultural_similarity = COMPARABLE_WEIGHTS.agriculturalType;
  }

  let bedroom_similarity = 0;
  if (
    subject.bedrooms != null &&
    candidate.bedrooms != null &&
    subject.bedrooms === candidate.bedrooms
  ) {
    bedroom_similarity = COMPARABLE_WEIGHTS.bedrooms;
  }

  let bathroom_similarity = 0;
  if (
    subject.bathrooms != null &&
    candidate.bathrooms != null &&
    subject.bathrooms === candidate.bathrooms
  ) {
    bathroom_similarity = COMPARABLE_WEIGHTS.bathrooms;
  }

  let sale_outcome_quality = 0;
  if (evidence.verifiedSale && isValidPositiveAmount(evidence.salePrice)) {
    sale_outcome_quality = COMPARABLE_WEIGHTS.verifiedSale;
  } else if (candidate.state === "sold") {
    sale_outcome_quality = 10;
  }

  let data_completeness = 0;
  if (candidate.verified) data_completeness += 5;
  if (candidate.sourceUrl) data_completeness += 3;
  if (isValidPositiveArea(candidate.floorSizeM2) || isValidPositiveArea(candidate.hectares)) {
    data_completeness += 5;
  }
  if (!candidate.conflict) data_completeness += 5;

  const evidenceScore = scoreHistoricalEvidence(
    candidate,
    classifyObservation(candidate),
  );
  const evidence_bonus = evidenceQualityBonus(evidenceScore.overallConfidence);

  const total =
    location_match +
    property_type_match +
    size_similarity +
    land_similarity +
    agricultural_similarity +
    bedroom_similarity +
    bathroom_similarity +
    sale_outcome_quality +
    data_completeness +
    evidence_bonus;

  const score: ComparableScoreBreakdown = {
    location_match,
    property_type_match,
    size_similarity,
    land_similarity,
    agricultural_similarity,
    bedroom_similarity,
    bathroom_similarity,
    sale_outcome_quality,
    data_completeness,
    evidence_bonus,
    total,
  };

  let confidence: ComparableConfidenceLevel;
  if (matchingEvidence.length < minimumMatchingSignals(subject)) {
    confidence = "Insufficient data";
  } else if (total >= 70 && sale_outcome_quality >= COMPARABLE_WEIGHTS.verifiedSale) {
    confidence = "High";
  } else if (total >= 45) {
    confidence = "Medium";
  } else if (total >= 25) {
    confidence = "Low";
  } else {
    confidence = "Insufficient data";
  }

  return { score, confidence };
}

export function buildMatchingEvidenceList(
  subject: HistoricalEventObservation,
  candidate: HistoricalEventObservation,
  config: ComparableIntelligenceConfig,
): { matching: string[]; conflicting: string[]; distanceKm: number | null } {
  const { signals, distanceKm } = collectLocationSignals(subject, candidate, config);
  const matching = [...signals];
  const conflicting: string[] = [];

  const typeCompat = compatiblePropertyTypes(subject.propertyType, candidate.propertyType);
  if (typeCompat.exact) matching.push("Same property type");
  else if (typeCompat.match) matching.push("Compatible property category");
  else if (subject.propertyType && candidate.propertyType) {
    conflicting.push(`Property type differs (${subject.propertyType} vs ${candidate.propertyType})`);
  }

  if (
    isValidPositiveArea(subject.floorSizeM2) &&
    isValidPositiveArea(candidate.floorSizeM2) &&
    sizeWithinTolerance(subject.floorSizeM2, candidate.floorSizeM2, config.floorSizeTolerancePct)
  ) {
    matching.push("Floor size within verified range");
  }

  if (
    subject.agriculturalSubtype &&
    candidate.agriculturalSubtype &&
    subject.agriculturalSubtype === candidate.agriculturalSubtype
  ) {
    matching.push(`Same agricultural type (${subject.agriculturalSubtype})`);
  }

  const evidence = buildSaleEvidence(candidate);
  if (evidence.verifiedSale) matching.push("Historical sale outcome verified");
  if (isValidPositiveAmount(evidence.salePrice)) matching.push("Sale price verified");

  if (candidate.state !== "sold" && candidate.state !== subject.state) {
    conflicting.push(`Outcome differs (${subject.state} vs ${candidate.state})`);
  }

  return { matching, conflicting, distanceKm };
}
