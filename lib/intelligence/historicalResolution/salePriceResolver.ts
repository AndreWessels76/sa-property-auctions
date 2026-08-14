/**
 * Strict sale price resolution — never map guide/reserve/auction prices (HI 4.2).
 */

import { extractPricingObservations } from "@/lib/acquisition/pricing/pricingExtractor";
import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { OutcomeExtractionDraft } from "@/lib/acquisition/outcomes/types";

const REJECT_FIELD_NAMES = new Set([
  "guide_price",
  "reserve_price",
  "starting_bid",
  "auction_price",
  "estimated_value",
  "valuation",
  "opening_bid",
  "market_value",
]);

export function resolveSalePriceEvidence(input: {
  classification: OutcomeClassification;
  draft?: OutcomeExtractionDraft | null;
  sourceText?: string | null;
}): {
  salePrice: number | null;
  supplied: boolean;
  confidence: "high" | "medium" | "low" | "none";
  evidenceText: string | null;
  rejectedReasons: string[];
} {
  const rejectedReasons: string[] = [];
  const draft = input.draft;
  const fromDraft = draft?.sale_price ?? null;
  const fromClass = input.classification.salePrice.salePrice;
  const salePrice = isValidPositiveAmount(fromDraft) ? fromDraft : fromClass;
  const conf =
    draft?.sale_price_confidence ??
    input.classification.salePrice.salePriceConfidence;

  if (input.sourceText) {
    const pricingDrafts = extractPricingObservations(
      { title: "", source_url: null, source_name: null },
      input.sourceText,
    );
    for (const p of pricingDrafts) {
      if (REJECT_FIELD_NAMES.has(p.field_name)) {
        rejectedReasons.push(`${p.field_name} rejected — not sale price semantics`);
      }
    }
    const guideOnly =
      pricingDrafts.some((p) => REJECT_FIELD_NAMES.has(p.field_name)) &&
      !pricingDrafts.some((p) => p.field_name === "sale_price");
    if (guideOnly && !isValidPositiveAmount(salePrice)) {
      return {
        salePrice: null,
        supplied: false,
        confidence: "none",
        evidenceText: null,
        rejectedReasons,
      };
    }
  }

  if (!isValidPositiveAmount(salePrice)) {
    return {
      salePrice: null,
      supplied: false,
      confidence: "none",
      evidenceText: draft?.sale_price_evidence ?? input.classification.salePrice.salePriceEvidence,
      rejectedReasons,
    };
  }

  if (input.classification.outcome !== "SOLD" && draft?.outcome !== "SOLD") {
    rejectedReasons.push("Sale price present but outcome is not SOLD");
    return {
      salePrice: null,
      supplied: true,
      confidence: "none",
      evidenceText: draft?.sale_price_evidence ?? null,
      rejectedReasons,
    };
  }

  return {
    salePrice,
    supplied: true,
    confidence: conf === "high" || conf === "medium" || conf === "low" ? conf : "none",
    evidenceText:
      draft?.sale_price_evidence ?? input.classification.salePrice.salePriceEvidence,
    rejectedReasons,
  };
}
