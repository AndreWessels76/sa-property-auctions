/**
 * Outcome + sale price relationship validation.
 */

import type { OutcomeExtractionDraft } from "./types";

export type OutcomeValidationResult = {
  valid: boolean;
  draft: OutcomeExtractionDraft;
  issues: string[];
};

export function validateOutcomeDraft(
  draft: OutcomeExtractionDraft,
): OutcomeValidationResult {
  const issues: string[] = [];
  const next = { ...draft };

  if (draft.sale_price != null && draft.sale_price <= 0) {
    issues.push("Sale price rejected — zero or negative");
    next.sale_price = null;
    next.sale_price_confidence = "none";
  }

  if (
    draft.sale_price != null &&
    draft.outcome !== "SOLD" &&
    draft.outcome !== "UNKNOWN"
  ) {
    next.review_required = true;
    next.review_category = "CONFLICT_REVIEW";
    issues.push(`Outcome ${draft.outcome} with sale price — conflict review required`);
  }

  if (draft.sale_price != null && draft.outcome === "UNKNOWN") {
    next.review_required = true;
    next.review_category = "SALE_PRICE_REVIEW";
    issues.push("Sale price without confirmed outcome — review required");
  }

  if (draft.outcome === "SOLD" && draft.sale_price == null) {
    // Allowed — SOLD without sale price
  }

  if (draft.confidence === "low" && draft.outcome !== "UNKNOWN") {
    next.review_required = true;
    next.review_category = next.review_category ?? "LOW_CONFIDENCE";
    issues.push("Low confidence outcome — review required");
  }

  return { valid: issues.length === 0 || next.outcome !== "UNKNOWN", draft: next, issues };
}
