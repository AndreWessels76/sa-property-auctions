/**
 * Concise evidence snippets for admin review.
 */

import type { PricingObservationDraft } from "./types";

export function buildPricingEvidenceSnippet(
  draft: PricingObservationDraft,
): string {
  const base = (draft.evidence_text || draft.raw_value || "").trim();
  if (base.length <= 240) return base;
  return `${base.slice(0, 237)}...`;
}

export function formatPricingObservationSummary(
  draft: PricingObservationDraft,
): string {
  const approx = draft.is_approximate ? "± " : "";
  if (draft.is_range && draft.min_value != null && draft.max_value != null) {
    return `${draft.field_name}: ${approx}R${draft.min_value} – R${draft.max_value} [${draft.status}]`;
  }
  if (draft.normalized_value == null) {
    return `${draft.field_name}: not supplied [${draft.status}]`;
  }
  const unit =
    draft.field_name === "floor_size_m2" || draft.field_name === "land_size_m2"
      ? " m²"
      : draft.field_name === "total_hectares"
        ? " ha"
        : draft.currency === "ZAR"
          ? ""
          : "";
  const prefix =
    draft.currency === "ZAR" &&
    !["floor_size_m2", "land_size_m2", "total_hectares"].includes(draft.field_name)
      ? "R"
      : "";
  return `${draft.field_name}: ${approx}${prefix}${draft.normalized_value}${unit} [${draft.status}]`;
}
