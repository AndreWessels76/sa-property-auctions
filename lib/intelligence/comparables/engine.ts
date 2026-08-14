/**
 * Comparable Property Engine — deterministic, evidence-backed.
 */

import { publicHistoricalRows } from "@/lib/intelligence/historical/historicalAggregation";
import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { PricingObservationRow } from "@/lib/repositories/PricingObservationRepository";
import {
  COMPARABLE_INTELLIGENCE_VERSION,
  DEFAULT_COMPARABLE_CONFIG,
  type ComparableIntelligenceConfig,
} from "./config";
import type {
  ComparableConfidenceLevel,
  ComparableRow,
  ComparableSearchResult,
  ComparableTableColumn,
  PropertyMarketEvidenceSummary,
} from "./types";
import { buildSaleEvidence } from "./saleEvidence";
import { pricePerHa, pricePerM2 } from "./priceMetrics";
import { buildMatchingEvidenceList, scoreComparable } from "./scoring";
import { compatiblePropertyTypes, minimumMatchingSignals } from "./matching";
import { buildCacheKey, dataVersionFromObservations, provenanceForObservation } from "./provenance";

function rejectCandidate(
  subject: HistoricalEventObservation,
  candidate: HistoricalEventObservation,
): string[] {
  const reasons: string[] = [];
  if (!candidate.verified) reasons.push("Unverified listing/event");
  if (candidate.conflict) reasons.push("Conflicting verified sources");
  if (!candidate.town && !candidate.suburb && !candidate.province) {
    reasons.push("Insufficient identity — no location");
  }
  if (candidate.propertyTypeStatus !== "known" || !candidate.propertyType) {
    reasons.push("Unknown property type");
  }
  if (subject.propertyMasterId && candidate.propertyMasterId === subject.propertyMasterId) {
    reasons.push("Same Property Master — not a distinct comparable");
  }
  if (subject.listingPropertyId && candidate.listingPropertyId === subject.listingPropertyId) {
    reasons.push("Same listing — not a comparable");
  }

  const typeCompat = compatiblePropertyTypes(subject.propertyType, candidate.propertyType);
  if (!typeCompat.match && subject.propertyType && candidate.propertyType) {
    reasons.push("Materially incompatible property type");
  }

  const evidence = buildSaleEvidence(candidate);
  if (candidate.state !== "sold") {
    reasons.push("Not a verified SOLD outcome — excluded from sale comparables");
  }
  if (!isValidPositiveAmount(evidence.salePrice)) {
    reasons.push("No verified sale price");
  }
  if (candidate.state === "sold" && !isValidPositiveAmount(evidence.salePrice) && evidence.salePriceConflict) {
    reasons.push("Sale price conflict");
  }

  const { matching } = buildMatchingEvidenceList(
    subject,
    candidate,
    DEFAULT_COMPARABLE_CONFIG,
  );
  if (matching.length < minimumMatchingSignals(subject)) {
    reasons.push("Insufficient verified matching signals — town/type match alone is not enough");
  }

  return reasons;
}

function rowFromCandidate(
  subject: HistoricalEventObservation,
  candidate: HistoricalEventObservation,
  config: ComparableIntelligenceConfig,
  title: string | null,
  pricingObs: PricingObservationRow[],
): ComparableRow {
  const rejectionReasons = rejectCandidate(subject, candidate);
  const rejected = rejectionReasons.length > 0;
  const { matching, conflicting, distanceKm } = buildMatchingEvidenceList(
    subject,
    candidate,
    config,
  );
  const { score, confidence } = scoreComparable(subject, candidate, config, matching);
  const saleEvidence = buildSaleEvidence(candidate, pricingObs);

  return {
    observationId: candidate.observationId,
    propertyMasterId: candidate.propertyMasterId,
    auctionEventId: candidate.auctionEventId,
    listingPropertyId: candidate.listingPropertyId,
    title,
    town: candidate.town,
    suburb: candidate.suburb,
    propertyType: candidate.propertyType,
    auctionDate: candidate.auctionDate,
    outcome: candidate.state,
    saleEvidence,
    floorSizeM2: candidate.floorSizeM2,
    landSizeM2: null,
    hectares: candidate.hectares,
    hectaresApproximate: candidate.hectaresApproximate,
    pricePerM2: pricePerM2(saleEvidence, candidate.floorSizeM2),
    pricePerHa: pricePerHa(saleEvidence, candidate.hectares, candidate.hectaresApproximate),
    distanceKm,
    comparableConfidence: rejected ? "Insufficient data" : confidence,
    score,
    matchingEvidence: matching,
    conflictingEvidence: conflicting,
    rejected,
    rejectionReasons,
    provenance: provenanceForObservation(candidate),
  };
}

function resolveTableColumns(rows: ComparableRow[]): ComparableTableColumn[] {
  const cols: ComparableTableColumn[] = [
    "property",
    "town_suburb",
    "property_type",
    "auction_date",
    "outcome",
  ];
  if (rows.some((r) => r.saleEvidence.salePrice != null)) cols.push("sale_price");
  if (rows.some((r) => r.floorSizeM2 != null)) cols.push("floor_size");
  if (rows.some((r) => r.hectares != null)) cols.push("hectares");
  if (rows.some((r) => r.pricePerM2.calculable)) cols.push("price_per_m2");
  if (rows.some((r) => r.pricePerHa.calculable)) cols.push("price_per_ha");
  if (rows.some((r) => r.distanceKm != null)) cols.push("distance");
  cols.push("confidence", "evidence");
  return cols;
}

export function findComparables(input: {
  subject: HistoricalEventObservation;
  corpus: HistoricalEventObservation[];
  propertyId: string;
  titleByListingId?: Map<string, string>;
  pricingObservations?: PricingObservationRow[];
  premium?: boolean;
  config?: ComparableIntelligenceConfig;
}): ComparableSearchResult {
  const config = input.config ?? DEFAULT_COMPARABLE_CONFIG;
  const historical = publicHistoricalRows(input.corpus);
  const limit = input.premium ? config.premiumComparableLimit : config.freeComparableLimit;

  const candidates: ComparableRow[] = [];
  const rejectedCandidates: Array<{ observationId: string; reasons: string[] }> = [];

  for (const row of historical) {
    const title =
      (row.listingPropertyId && input.titleByListingId?.get(row.listingPropertyId)) ?? null;
    const comparable = rowFromCandidate(
      input.subject,
      row,
      config,
      title,
      input.pricingObservations ?? [],
    );
    if (comparable.rejected) {
      rejectedCandidates.push({
        observationId: row.observationId,
        reasons: comparable.rejectionReasons,
      });
      continue;
    }
    candidates.push(comparable);
  }

  candidates.sort((a, b) => b.score.total - a.score.total);
  const selected = candidates.slice(0, limit);
  const best = selected[0] ?? null;

  let overallConfidence: ComparableConfidenceLevel = "Insufficient data";
  if (best) overallConfidence = best.comparableConfidence;

  const latestDate = historical.reduce<string | null>((acc, r) => {
    if (!r.auctionDate) return acc;
    if (!acc || r.auctionDate > acc) return r.auctionDate;
    return acc;
  }, null);

  const limitations: string[] = [];
  const soldInCorpus = historical.filter((r) => r.state === "sold").length;
  if (soldInCorpus === 0) {
    limitations.push("No verified sale outcomes in historical corpus — sale comparables unavailable");
  } else if (soldInCorpus < config.minimumComparableSales) {
    limitations.push(
      `${soldInCorpus} verified sale${soldInCorpus === 1 ? "" : "s"} in corpus — below comparable minimum (${config.minimumComparableSales})`,
    );
  }
  if (selected.length === 0) {
    limitations.push("No eligible comparables matched verified similarity rules");
  }

  return {
    version: COMPARABLE_INTELLIGENCE_VERSION,
    subjectPropertyId: input.propertyId,
    subjectMasterId: input.subject.propertyMasterId,
    subjectObservation: input.subject,
    bestComparable: best,
    comparables: selected,
    rejectedCandidates: rejectedCandidates.slice(0, 20),
    tableColumns: resolveTableColumns(selected),
    limitations,
    sampleSize: selected.length,
    confidence: overallConfidence,
    premium: input.premium ?? false,
    cacheKey: buildCacheKey({
      propertyId: input.propertyId,
      propertyMasterId: input.subject.propertyMasterId,
      dataVersion: dataVersionFromObservations(historical.length, latestDate),
    }),
  };
}

export function buildMarketEvidenceSummary(
  subjectObservations: HistoricalEventObservation[],
  comparables: ComparableSearchResult,
): PropertyMarketEvidenceSummary {
  const historical = publicHistoricalRows(subjectObservations);
  const sold = historical.filter((r) => r.state === "sold");
  const subject = comparables.subjectObservation;
  const saleEvidence = subject ? buildSaleEvidence(subject) : null;

  return {
    historicalAuctions: historical.length,
    verifiedSales: sold.length,
    bestComparableConfidence: comparables.confidence,
    hasSalePriceEvidence: Boolean(saleEvidence?.verifiedSale),
    pricePerM2: subject
      ? pricePerM2(buildSaleEvidence(subject), subject.floorSizeM2)
      : {
          value: null,
          label: "Price/m²",
          calculable: false,
          reason: "Insufficient data",
          approximate: false,
        },
    pricePerHa: subject
      ? pricePerHa(buildSaleEvidence(subject), subject.hectares, subject.hectaresApproximate)
      : {
          value: null,
          label: "Price/ha",
          calculable: false,
          reason: "Insufficient data",
          approximate: false,
        },
    limitations: comparables.limitations,
  };
}

export function subjectObservationFromDataset(
  dataset: HistoricalEventObservation[],
  propertyId: string,
  masterId: string | null,
): HistoricalEventObservation | null {
  const match =
    dataset.find((o) => o.listingPropertyId === propertyId) ??
    (masterId ? dataset.find((o) => o.propertyMasterId === masterId) : null);
  return match ?? null;
}
