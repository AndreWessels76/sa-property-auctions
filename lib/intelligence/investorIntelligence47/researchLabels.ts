/**
 * Investor-friendly research labels (II 4.7).
 * PROVEN / TESTED / MISSING / REVIEW REQUIRED — non-technical language.
 */

import type {
  FieldEvidenceStatus,
  InvestorResearchSnapshot,
} from "@/lib/intelligence/investorIntelligence46/types";
import { II47_MINIMUM_COMPARABLE_SALES, II47_MINIMUM_MARKET_SALES } from "./config";

export type InvestorResearchLabel = "PROVEN" | "TESTED" | "MISSING" | "REVIEW REQUIRED";

export type LabeledResearchField = {
  label: string;
  status: InvestorResearchLabel;
  detail: string;
};

export function statusToInvestorLabel(status: FieldEvidenceStatus): InvestorResearchLabel {
  if (status === "VERIFIED" || status === "FACT" || status === "CALCULATED") return "PROVEN";
  if (status === "SOURCE_CONFIRMED" || status === "EXTRACTED" || status === "INFERRED") {
    return "TESTED";
  }
  if (status === "CONFLICT" || status === "REVIEW_REQUIRED") return "REVIEW REQUIRED";
  return "MISSING";
}

function formatCurrency(n: number): string {
  return `R${n.toLocaleString("en-ZA")}`;
}

export function buildResearchInvestorLabels(
  research: InvestorResearchSnapshot,
  verifiedSales: number,
  comparableCount: number,
): LabeledResearchField[] {
  const labels: LabeledResearchField[] = [];

  const outcomeField = research.historical.fields.find((f) => f.field === "outcome");
  if (outcomeField) {
    const status = statusToInvestorLabel(outcomeField.status);
    labels.push({
      label: "Sale outcome",
      status,
      detail:
        status === "PROVEN" && outcomeField.value
          ? `PROVEN — ${String(outcomeField.value).toUpperCase()}`
          : status === "TESTED" && outcomeField.value
            ? `TESTED — ${String(outcomeField.value)} (source confirmed, not fully verified)`
            : status === "REVIEW REQUIRED"
              ? "REVIEW REQUIRED — outcome evidence needs human verification"
              : "MISSING — no confirmed sale outcome evidence",
    });
  }

  const priceField = research.historical.fields.find((f) => f.field === "salePriceEvidence");
  if (priceField) {
    const status = statusToInvestorLabel(priceField.status);
    labels.push({
      label: "Sale price",
      status,
      detail:
        status === "PROVEN" && typeof priceField.value === "number"
          ? `PROVEN — ${formatCurrency(priceField.value)}`
          : status === "PROVEN" && priceField.value
            ? `PROVEN — ${String(priceField.value)}`
            : status === "REVIEW REQUIRED"
              ? "REVIEW REQUIRED — sale price evidence conflict or ambiguity"
              : "MISSING — no verified sale price (guide/reserve/auction prices are not sale prices)",
    });
  }

  labels.push({
    label: "Comparables",
    status:
      comparableCount >= II47_MINIMUM_COMPARABLE_SALES
        ? "PROVEN"
        : comparableCount > 0
          ? "TESTED"
          : "MISSING",
    detail:
      comparableCount >= II47_MINIMUM_COMPARABLE_SALES
        ? `PROVEN — ${comparableCount} verified comparable sales`
        : `INSUFFICIENT DATA — ${comparableCount} verified comparable sales (minimum ${II47_MINIMUM_COMPARABLE_SALES})`,
  });

  const marketStatus =
    verifiedSales >= II47_MINIMUM_MARKET_SALES &&
    research.market.medianSalePrice !== "INSUFFICIENT_DATA"
      ? "PROVEN"
      : verifiedSales > 0
        ? "TESTED"
        : "MISSING";

  labels.push({
    label: "Market median",
    status: marketStatus,
    detail:
      marketStatus === "PROVEN" && typeof research.market.medianSalePrice === "number"
        ? `PROVEN — ${formatCurrency(research.market.medianSalePrice)} (${verifiedSales} verified sales)`
        : `INSUFFICIENT DATA — ${verifiedSales} verified sales (minimum ${II47_MINIMUM_MARKET_SALES})`,
  });

  return labels;
}
