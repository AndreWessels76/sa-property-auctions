/**
 * Outcome conflict detection — never auto-resolve.
 */

import type { OutcomeClassification } from "./types";
import type { OutcomeConflict } from "./types";

export function detectOutcomeConflicts(
  classifications: OutcomeClassification[],
): OutcomeConflict[] {
  const conflicts: OutcomeConflict[] = [];
  for (const c of classifications) {
    if (c.salePrice.conflict) {
      conflicts.push({
        id: `sale-price:${c.observationId}`,
        propertyMasterId: c.outcomeEvidence.propertyMasterId,
        auctionEventId: c.outcomeEvidence.auctionEventId,
        claimA: "sale_price conflict",
        claimB: "sale_price conflict",
        evidenceA: c.salePrice.salePriceEvidence,
        evidenceB: c.salePrice.conflictNote,
        status: "HISTORICAL_CONFLICT",
      });
    }
  }
  return conflicts;
}
