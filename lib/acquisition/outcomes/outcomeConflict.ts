/**
 * Outcome conflict detection — never auto-resolve.
 */

import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import type { OutcomeExtractionDraft } from "./types";

export type OutcomeConflictDraft = {
  claim_a: string;
  claim_b: string;
  evidence_a: string | null;
  evidence_b: string | null;
  source_a: string | null;
  source_b: string | null;
};

export function detectOutcomeObservationConflicts(input: {
  existing: OutcomeObservationRow[];
  incoming: OutcomeExtractionDraft;
}): OutcomeConflictDraft[] {
  const conflicts: OutcomeConflictDraft[] = [];
  const trusted = input.existing.filter(
    (o) => o.outcome !== "UNKNOWN" && o.confidence !== "low",
  );

  for (const prev of trusted) {
    if (prev.outcome !== input.incoming.outcome) {
      conflicts.push({
        claim_a: `${prev.outcome}`,
        claim_b: `${input.incoming.outcome}`,
        evidence_a: prev.evidence_text,
        evidence_b: input.incoming.evidence_text,
        source_a: prev.source_url,
        source_b: input.incoming.source_url,
      });
    }
    if (
      prev.sale_price != null &&
      input.incoming.sale_price != null &&
      Math.abs(prev.sale_price - input.incoming.sale_price) > 0.01
    ) {
      conflicts.push({
        claim_a: `SALE_PRICE ${prev.sale_price}`,
        claim_b: `SALE_PRICE ${input.incoming.sale_price}`,
        evidence_a: prev.evidence_text,
        evidence_b: input.incoming.sale_price_evidence,
        source_a: prev.source_url,
        source_b: input.incoming.source_url,
      });
    }
  }

  return conflicts;
}
