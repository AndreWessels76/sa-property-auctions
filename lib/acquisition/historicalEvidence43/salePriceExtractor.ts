/**
 * Sale price extraction — explicit labels only (HEA 4.3).
 */

import { extractPricingObservations } from "@/lib/acquisition/pricing/pricingExtractor";
import type { ExtractionCorpus } from "@/lib/dueDiligence/extraction/types";

const REJECTED_LABELS = [
  "reserve",
  "guide",
  "starting",
  "asking",
  "estimated",
  "valuation",
  "market value",
  "expected",
  "potential",
];

export function extractVerifiedSalePriceFromText(
  text: string,
  corpus: ExtractionCorpus,
): {
  salePrice: number | null;
  rawText: string | null;
  label: string | null;
  confidence: string | null;
  reviewRequired: boolean;
  reason: string;
} {
  const observations = extractPricingObservations(corpus, text);
  const saleCandidates = observations.filter((o) => {
    const label = `${o.field_name} ${o.evidence_text}`.toLowerCase();
    if (REJECTED_LABELS.some((r) => label.includes(r))) return false;
    return (
      o.field_name === "sale_price" ||
      label.includes("sold for") ||
      label.includes("sale price") ||
      label.includes("hammer price") ||
      label.includes("final selling")
    );
  });

  if (saleCandidates.length === 0) {
    const rejected = observations.filter((o) =>
      REJECTED_LABELS.some((r) =>
        `${o.field_name} ${o.evidence_text}`.toLowerCase().includes(r),
      ),
    );
    if (rejected.length > 0) {
      return {
        salePrice: null,
        rawText: rejected[0]?.raw_value ?? null,
        label: rejected[0]?.field_name ?? null,
        confidence: null,
        reviewRequired: false,
        reason: "Only reserve/guide/starting prices found — not verified sale price",
      };
    }
    return {
      salePrice: null,
      rawText: null,
      label: null,
      confidence: null,
      reviewRequired: false,
      reason: "No explicit sale price label in source text",
    };
  }

  if (saleCandidates.length > 1) {
    const prices = saleCandidates.map((c) => c.normalized_value).filter((v) => v != null);
    const unique = new Set(prices);
    if (unique.size > 1) {
      return {
        salePrice: null,
        rawText: saleCandidates.map((c) => c.raw_value).join(" | "),
        label: saleCandidates[0]?.field_name ?? null,
        confidence: null,
        reviewRequired: true,
        reason: "Conflicting sale price values in source",
      };
    }
  }

  const best = saleCandidates[0]!;
  return {
    salePrice: best.normalized_value ?? null,
    rawText: best.raw_value ?? null,
    label: best.field_name ?? null,
    confidence: best.status === "verified" ? "high" : "medium",
    reviewRequired: false,
    reason: "Explicit sale price label matched",
  };
}
