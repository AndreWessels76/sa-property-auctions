/**
 * Outcome + sale price agreement rules (HI 4.2).
 */

import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { OutcomeExtractionDraft } from "@/lib/acquisition/outcomes/types";
import type { OutcomePriceAgreement, ResolutionLabel } from "./types";

const NON_SOLD_OUTCOMES = new Set(["PASSED_IN", "WITHDRAWN", "CANCELLED", "POSTPONED"]);

export function validateOutcomePriceAgreement(input: {
  classification: OutcomeClassification;
  draft?: OutcomeExtractionDraft | null;
}): {
  agreement: OutcomePriceAgreement;
  label: ResolutionLabel;
  conflicts: string[];
} {
  const { classification: c, draft } = input;
  const outcome = draft?.outcome ?? c.outcome;
  const salePrice = draft?.sale_price ?? c.salePrice.salePrice;
  const hasPrice = isValidPositiveAmount(salePrice);
  const priceConf = draft?.sale_price_confidence ?? c.salePrice.salePriceConfidence;
  const verifiedPrice = hasPrice && priceConf !== "low" && priceConf !== "none";
  const conflicts: string[] = [];

  if (c.salePrice.conflict || draft?.review_category === "CONFLICT_REVIEW") {
    conflicts.push("Sale price or outcome conflict detected");
    return { agreement: "CONFLICT", label: null, conflicts };
  }

  if (outcome === "SOLD" && verifiedPrice) {
    return { agreement: "VERIFIED", label: "VERIFIED_SOLD", conflicts };
  }

  if (outcome === "SOLD" && !hasPrice) {
    return { agreement: "SOLD_WITHOUT_PRICE", label: "SOLD_WITHOUT_PRICE", conflicts };
  }

  if (outcome === "UNKNOWN" && hasPrice) {
    conflicts.push("Sale price without confirmed outcome");
    return { agreement: "REVIEW_REQUIRED", label: null, conflicts };
  }

  if (NON_SOLD_OUTCOMES.has(outcome) && hasPrice) {
    conflicts.push(`${outcome} with sale price evidence — conflict`);
    return { agreement: "CONFLICT", label: null, conflicts };
  }

  if (outcome === "UNKNOWN" || outcome === "COMPLETED_UNKNOWN") {
    return { agreement: "INSUFFICIENT", label: "NOT_SUPPLIED", conflicts };
  }

  if (isValidPositiveAmount(salePrice) && outcome !== "SOLD") {
    return { agreement: "REVIEW_REQUIRED", label: null, conflicts };
  }

  if (c.confirmed) {
    return { agreement: "VERIFIED", label: "VERIFIED_OUTCOME", conflicts };
  }

  return { agreement: "INSUFFICIENT", label: "INSUFFICIENT_DATA", conflicts };
}
