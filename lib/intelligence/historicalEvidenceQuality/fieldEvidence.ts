/**
 * Field-level evidence records (HEQ 4.4).
 */

import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { HistoricalEvidenceScore } from "@/lib/intelligence/historicalEvidence/types";
import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import type { PricingObservationRow } from "@/lib/repositories/PricingObservationRepository";
import type { FieldEvidenceRecord, FieldEvidenceStatus } from "./types";

function levelToStatus(
  level: string,
  hasValue: boolean,
  conflict?: boolean,
): FieldEvidenceStatus {
  if (conflict) return "CONFLICT";
  if (level === "HIGH" && hasValue) return "VERIFIED";
  if (level === "MEDIUM" && hasValue) return "SOURCE_CONFIRMED";
  if (level === "LOW" && hasValue) return "EXTRACTED";
  if (!hasValue) return "NOT_SUPPLIED";
  return "NOT_FOUND";
}

function pricingFieldStatus(
  fieldName: string,
  pricingObs: PricingObservationRow[],
  event: HistoricalEventObservation,
): FieldEvidenceStatus {
  const obs = pricingObs.filter(
    (o) =>
      o.field_name === fieldName &&
      ((event.auctionEventId && o.auction_event_id === event.auctionEventId) ||
        (event.listingPropertyId && o.property_id === event.listingPropertyId)),
  );
  if (obs.some((o) => o.status === "conflict")) return "CONFLICT";
  if (obs.some((o) => o.status === "verified")) return "VERIFIED";
  if (obs.some((o) => o.status === "source_confirmed")) return "SOURCE_CONFIRMED";
  if (obs.length > 0) return "EXTRACTED";
  return "NOT_SUPPLIED";
}

export function buildFieldEvidence(input: {
  event: HistoricalEventObservation;
  classification: OutcomeClassification;
  score: HistoricalEvidenceScore;
  outcomeObs?: OutcomeObservationRow | null;
  pricingObs?: PricingObservationRow[];
}): FieldEvidenceRecord[] {
  const { event, classification: c, score, outcomeObs } = input;
  const pricingObs = input.pricingObs ?? [];
  const snap = outcomeObs?.source_snapshot_id ?? null;
  const extractedAt = outcomeObs?.created_at ?? null;
  const source = event.sourceUrl ?? event.sourceName;

  const address =
    [event.suburb, event.town].filter(Boolean).join(", ") || null;

  const fields: FieldEvidenceRecord[] = [
    {
      field: "identity",
      value: event.propertyMasterId,
      status: event.propertyMasterId
        ? levelToStatus(score.identityConfidence.level, true, event.conflict)
        : "REVIEW_REQUIRED",
      source,
      snapshot: snap,
      confidence: score.identityConfidence.level,
      extractedAt,
    },
    {
      field: "property_type",
      value: event.propertyType,
      status:
        event.propertyTypeStatus === "known" ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      snapshot: snap,
      confidence: event.propertyTypeStatus === "known" ? "medium" : null,
      extractedAt,
    },
    {
      field: "town",
      value: event.town,
      status: levelToStatus(score.locationConfidence.level, Boolean(event.town?.trim())),
      source,
      snapshot: snap,
      confidence: score.locationConfidence.level,
      extractedAt,
    },
    {
      field: "suburb",
      value: event.suburb,
      status: event.suburb?.trim() ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      snapshot: snap,
      confidence: event.suburb ? "medium" : null,
      extractedAt,
    },
    {
      field: "address",
      value: address,
      status: address ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      snapshot: snap,
      confidence: address ? "medium" : null,
      extractedAt,
    },
    {
      field: "land_size",
      value: event.hectares ?? event.floorSizeM2,
      status:
        event.hectares != null || event.floorSizeM2 != null
          ? "SOURCE_CONFIRMED"
          : "NOT_SUPPLIED",
      source,
      snapshot: snap,
      confidence: event.hectares != null ? "medium" : null,
      extractedAt,
    },
    {
      field: "hectares",
      value: event.hectares,
      status: event.hectares != null
        ? event.hectaresApproximate
          ? "EXTRACTED"
          : "SOURCE_CONFIRMED"
        : "NOT_SUPPLIED",
      source,
      snapshot: snap,
      confidence: event.hectaresApproximate ? "low" : "medium",
      extractedAt,
    },
    {
      field: "floor_size",
      value: event.floorSizeM2,
      status: event.floorSizeM2 != null ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      snapshot: snap,
      confidence: event.floorSizeM2 != null ? "medium" : null,
      extractedAt,
    },
    {
      field: "auction_date",
      value: event.auctionDate,
      status: levelToStatus(score.dateEvidence.level, Boolean(event.auctionDate)),
      source,
      snapshot: snap,
      confidence: score.dateEvidence.level,
      extractedAt,
    },
    {
      field: "auction_outcome",
      value: c.outcome,
      status: levelToStatus(
        score.outcomeEvidence.level,
        c.outcome !== "UNKNOWN" && c.outcome !== "COMPLETED_UNKNOWN",
        c.salePrice.conflict || event.conflict,
      ),
      source,
      snapshot: snap,
      confidence: score.outcomeEvidence.level,
      extractedAt,
    },
    {
      field: "sale_date",
      value: null,
      status: "NOT_SUPPLIED",
      source,
      snapshot: snap,
      confidence: null,
      extractedAt,
    },
    {
      field: "sale_price",
      value: c.salePrice.salePrice,
      status: levelToStatus(
        score.salePriceEvidence.level,
        isValidPositiveAmount(c.salePrice.salePrice),
        c.salePrice.conflict,
      ),
      source,
      snapshot: snap,
      confidence: c.salePrice.salePriceConfidence,
      extractedAt,
    },
    {
      field: "auction_price",
      value: event.prices.auction_price,
      status: pricingFieldStatus("auction_price", pricingObs, event),
      source,
      snapshot: snap,
      confidence: "medium",
      extractedAt,
    },
    {
      field: "guide_price",
      value: event.prices.guide_price,
      status: pricingFieldStatus("guide_price", pricingObs, event),
      source,
      snapshot: snap,
      confidence: "medium",
      extractedAt,
    },
    {
      field: "reserve_price",
      value: event.prices.reserve_price,
      status: pricingFieldStatus("reserve_price", pricingObs, event),
      source,
      snapshot: snap,
      confidence: "medium",
      extractedAt,
    },
    {
      field: "starting_bid",
      value: event.prices.starting_bid,
      status: pricingFieldStatus("starting_bid", pricingObs, event),
      source,
      snapshot: snap,
      confidence: "medium",
      extractedAt,
    },
    {
      field: "agency",
      value: event.agency ?? event.sourceName,
      status: event.agency || event.sourceName ? "SOURCE_CONFIRMED" : "NOT_SUPPLIED",
      source,
      snapshot: snap,
      confidence: "medium",
      extractedAt,
    },
    {
      field: "source",
      value: event.sourceUrl,
      status: levelToStatus(score.sourceEvidence.level, Boolean(event.sourceUrl?.trim())),
      source: event.sourceUrl,
      snapshot: snap,
      confidence: score.sourceEvidence.level,
      extractedAt,
    },
  ];

  return fields;
}
