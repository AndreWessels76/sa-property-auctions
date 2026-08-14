/**
 * Outcome and sale price evidence — provenance required.
 */

import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { PricingObservationRow } from "@/lib/repositories/PricingObservationRepository";
import { classifyAuctionOutcome, isConfirmedOutcome } from "./classification";
import type {
  OutcomeClassification,
  OutcomeEvidence,
  SalePriceEvidence,
} from "./types";

function saleObsConflict(obs: PricingObservationRow[]): boolean {
  const trusted = obs.filter(
    (o) => o.field_name === "sale_price" && o.status !== "conflict" && isValidPositiveAmount(o.normalized_value),
  );
  const conflicts = obs.filter((o) => o.field_name === "sale_price" && o.status === "conflict");
  if (conflicts.length > 0) return true;
  return new Set(trusted.map((o) => o.normalized_value)).size > 1;
}

export function buildSalePriceEvidence(
  row: HistoricalEventObservation,
  pricingObs: PricingObservationRow[] = [],
): SalePriceEvidence {
  const obs = pricingObs.filter(
    (o) =>
      (row.auctionEventId && o.auction_event_id === row.auctionEventId) ||
      (row.listingPropertyId && o.property_id === row.listingPropertyId),
  );
  const saleObs = obs
    .filter((o) => o.field_name === "sale_price" && o.status !== "conflict")
    .sort((a, b) => {
      const rank = (s: string) => (s === "verified" ? 3 : s === "source_confirmed" ? 2 : 1);
      return rank(b.status) - rank(a.status);
    })[0];

  const conflict = saleObsConflict(obs);
  const sold = row.state === "sold";
  const price = conflict ? null : row.prices.sale_price;

  let confidence: SalePriceEvidence["salePriceConfidence"] = "none";
  if (conflict) confidence = "none";
  else if (saleObs?.status === "verified") confidence = "high";
  else if (saleObs?.status === "source_confirmed") confidence = "medium";
  else if (isValidPositiveAmount(price) && sold) confidence = "medium";

  return {
    salePrice: isValidPositiveAmount(price) ? price : null,
    salePriceSource: saleObs?.source_name ?? row.sourceName,
    salePriceObservedAt: saleObs?.extracted_at ?? saleObs?.verified_at ?? null,
    salePriceEvidence: saleObs?.evidence_text ?? (sold && price ? "Auction event sold status" : null),
    salePriceConfidence: confidence,
    conflict,
    conflictNote: conflict ? "Conflict — two verified source values" : null,
  };
}

export function buildOutcomeEvidence(
  row: HistoricalEventObservation,
  outcome: ReturnType<typeof classifyAuctionOutcome>,
): OutcomeEvidence {
  const types: OutcomeEvidence["evidenceTypes"] = ["auction_event_status"];
  if (row.sourceUrl) types.push("source_status");
  if (row.sourceUnit === "auction_event") types.push("auction_result_page");

  let confidence: OutcomeEvidence["confidence"] = "low";
  if (isConfirmedOutcome(outcome) && row.verified && row.sourceUnit === "auction_event") {
    confidence = "high";
  } else if (row.verified) confidence = "medium";

  return {
    outcome,
    confidence,
    evidenceTypes: types,
    sourceUrl: row.sourceUrl,
    sourceSnapshotId: null,
    sourceTimestamp: row.auctionDate,
    evidenceText: `Historical state: ${row.state} (${row.sourceUnit})`,
    extractionMethod: row.sourceUnit === "auction_event" ? "auction_event_status" : "listing_fallback",
    auctionEventId: row.auctionEventId,
    propertyMasterId: row.propertyMasterId,
    listingPropertyId: row.listingPropertyId,
  };
}

export function classifyObservation(
  row: HistoricalEventObservation,
  pricingObs: PricingObservationRow[] = [],
): OutcomeClassification {
  const outcome = classifyAuctionOutcome(row);
  return {
    observationId: row.observationId,
    historicalState: row.state,
    outcome,
    confirmed: isConfirmedOutcome(outcome),
    outcomeEvidence: buildOutcomeEvidence(row, outcome),
    salePrice: buildSalePriceEvidence(row, pricingObs),
  };
}

export function classifyObservations(
  rows: HistoricalEventObservation[],
  pricingObs: PricingObservationRow[] = [],
): OutcomeClassification[] {
  return rows.map((r) => classifyObservation(r, pricingObs));
}
