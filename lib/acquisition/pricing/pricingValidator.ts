/**
 * Pricing validation — zero anomalies, range integrity, no fabrication checks.
 */

import type { PricingObservationDraft } from "./types";

export type PricingValidationResult = {
  valid: boolean;
  issues: string[];
  drafts: PricingObservationDraft[];
};

export function validatePricingDrafts(
  drafts: PricingObservationDraft[],
): PricingValidationResult {
  const issues: string[] = [];
  const out: PricingObservationDraft[] = [];

  for (const d of drafts) {
    const next = { ...d };

    if (d.currency === "ZAR" && d.normalized_value === 0 && !d.is_range) {
      next.status = "anomaly";
      issues.push(`${d.field_name}: zero value flagged as anomaly`);
    }

    if (
      d.is_range &&
      (d.min_value == null ||
        d.max_value == null ||
        d.min_value > d.max_value)
    ) {
      issues.push(`${d.field_name}: invalid range`);
      continue;
    }

    if (
      d.normalized_value != null &&
      d.normalized_value < 0
    ) {
      issues.push(`${d.field_name}: negative value rejected`);
      continue;
    }

    // Never allow silent cross-field identity: starting_bid must stay starting_bid
    if (d.field_name === "starting_bid" && d.status === "extracted") {
      next.status = "needs_verification";
    }

    if (d.field_name === "from_price" && d.status === "extracted") {
      next.status = "needs_verification";
    }

    out.push(next);
  }

  return {
    valid: issues.length === 0 || out.length > 0,
    issues,
    drafts: out,
  };
}

/** True when listing has no usable price observation. */
export function isPricingNotSupplied(drafts: PricingObservationDraft[]): boolean {
  return !drafts.some((d) =>
    [
      "auction_price",
      "reserve_price",
      "guide_price",
      "estimated_value",
      "sale_price",
      "starting_bid",
      "from_price",
    ].includes(d.field_name) &&
    (d.normalized_value != null || d.is_range),
  );
}
