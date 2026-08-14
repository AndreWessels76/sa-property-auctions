/**
 * Deterministic pricing extraction from licensed source text / structured fields.
 * Never cross-maps price semantics. Never fabricates.
 */

import { structuredEvidence, textEvidence } from "@/lib/dueDiligence/extraction/evidenceBuilder";
import type { ExtractionCorpus, FieldEvidence } from "@/lib/dueDiligence/extraction/types";
import { parseMoneyExpression, PRICING_PARSER_VERSION } from "./pricingParser";
import { normalizeFloorSizeFromText, normalizeLandSizeObservation } from "./pricingNormalizer";
import type { PricingFieldName, PricingObservationDraft } from "./types";

export type { PricingFieldName, PricingObservationDraft };

/** Label patterns — order matters (more specific first). */
const LABEL_RULES: Array<{
  field: PricingFieldName;
  patterns: RegExp[];
}> = [
  {
    field: "guide_price",
    patterns: [
      /guide\s*price\s*[/\\]?\s*reserve(?:\s*price)?\s*[:\-]?\s*([^\n;|]{3,60})/i,
      /(?:guide|asking)\s*price\s*[:\-]?\s*([^\n;|]{3,60})/i,
      /guide\s*[:\-]?\s*((?:R|ZAR)[^\n;|]{2,50})/i,
    ],
  },
  {
    field: "reserve_price",
    patterns: [
      /starting\s*bid\s*[/\\]\s*reserve(?:\s*price)?\s*[:\-]?\s*([^\n;|]{3,60})/i,
      /reserve(?:\s*price)?\s*[:\-]?\s*([^\n;|]{3,60})/i,
    ],
  },
  {
    field: "estimated_value",
    patterns: [
      /estimated?\s*(?:market\s*)?value\s*[:\-]?\s*([^\n;|]{3,60})/i,
      /valuation\s*[:\-]?\s*((?:R|ZAR)[^\n;|]{2,50})/i,
      /market\s*value\s*[:\-]?\s*([^\n;|]{3,60})/i,
    ],
  },
  {
    field: "sale_price",
    patterns: [
      /(?:sold\s*(?:for|at)|sale\s*price|purchase\s*price|hammer\s*price|final\s*selling\s*price)\s*[:\-]?\s*([^\n;|]{3,60})/i,
      /winning\s*bid\s*[:\-]?\s*([^\n;|]{3,60})/i,
    ],
  },
  {
    field: "auction_price",
    patterns: [
      /auction\s*price\s*[:\-]?\s*([^\n;|]{3,60})/i,
    ],
  },
  {
    field: "starting_bid",
    patterns: [
      /starting\s*bid\s*[:\-]?\s*([^\n;|]{3,60})/i,
      /opening\s*bid\s*[:\-]?\s*([^\n;|]{3,60})/i,
    ],
  },
  {
    field: "from_price",
    patterns: [
      /\bfrom\s*((?:R|ZAR)\s*[\d][\d\s.,]*(?:\s*(?:million|mil|m))?)/i,
    ],
  },
];

function positiveStructured(
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function moneyDraft(
  field: PricingFieldName,
  rawSnippet: string,
  money: NonNullable<ReturnType<typeof parseMoneyExpression>>,
  corpus: ExtractionCorpus,
  method: "deterministic_text" | "structured_field",
): PricingObservationDraft {
  const anomaly = money.amount === 0;
  return {
    field_name: field,
    raw_value: money.originalText,
    normalized_value: money.isRange ? null : money.amount,
    currency: money.currency,
    is_approximate: money.isApproximate,
    is_range: money.isRange,
    min_value: money.minValue,
    max_value: money.maxValue,
    status: anomaly
      ? "anomaly"
      : field === "from_price" || field === "starting_bid"
        ? "needs_verification"
        : "extracted",
    evidence_text: rawSnippet.slice(0, 240),
    source_name: corpus.source_name ?? null,
    source_url: corpus.source_url ?? null,
    parser_version: PRICING_PARSER_VERSION,
    extraction_method: method,
    conversion_method: null,
    notes: anomaly
      ? "Zero price flagged as pricing anomaly — not treated as valid without verification"
      : field === "starting_bid"
        ? "Starting bid is a separate concept — not auto-mapped to reserve"
        : field === "from_price"
          ? "From-price observation — needs verification; not auction/reserve/sale"
          : null,
  };
}

/**
 * Extract pricing + size observations from corpus + page text.
 */
export function extractPricingObservations(
  corpus: ExtractionCorpus & {
    auction_price?: number | null;
    reserve_price?: number | null;
    estimated_value?: number | null;
  },
  text: string,
): PricingObservationDraft[] {
  const out: PricingObservationDraft[] = [];
  const seen = new Set<string>();

  const push = (d: PricingObservationDraft | null) => {
    if (!d) return;
    const key = `${d.field_name}:${d.normalized_value ?? d.min_value}:${d.raw_value}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(d);
  };

  // Structured listing fields — preserve semantics (never map auction→guide)
  const structuredAuction = positiveStructured(corpus.auction_price);
  if (structuredAuction != null) {
    push(
      moneyDraft(
        "auction_price",
        String(structuredAuction),
        {
          amount: structuredAuction,
          currency: "ZAR",
          isApproximate: false,
          isRange: false,
          minValue: null,
          maxValue: null,
          originalText: String(structuredAuction),
        },
        corpus,
        "structured_field",
      ),
    );
  }

  const structuredReserve = positiveStructured(corpus.reserve_price);
  if (structuredReserve != null) {
    push(
      moneyDraft(
        "reserve_price",
        String(structuredReserve),
        {
          amount: structuredReserve,
          currency: "ZAR",
          isApproximate: false,
          isRange: false,
          minValue: null,
          maxValue: null,
          originalText: String(structuredReserve),
        },
        corpus,
        "structured_field",
      ),
    );
  }

  const structuredEstimate = positiveStructured(corpus.estimated_value);
  if (structuredEstimate != null) {
    push(
      moneyDraft(
        "estimated_value",
        String(structuredEstimate),
        {
          amount: structuredEstimate,
          currency: "ZAR",
          isApproximate: false,
          isRange: false,
          minValue: null,
          maxValue: null,
          originalText: String(structuredEstimate),
        },
        corpus,
        "structured_field",
      ),
    );
  }

  const haystack = text || "";

  for (const rule of LABEL_RULES) {
    for (const re of rule.patterns) {
      const m = haystack.match(re);
      if (!m?.[1]) continue;
      const snippet = m[0].trim();
      const money = parseMoneyExpression(m[1]);
      if (!money) {
        // Unsupported currency or unparseable — record needs_verification only when ZAR-like failed
        if (/\b(USD|EUR|GBP|AUD|\$|€|£)\b/i.test(m[1])) {
          push({
            field_name: rule.field,
            raw_value: m[1].trim(),
            normalized_value: null,
            currency: null,
            is_approximate: false,
            is_range: false,
            min_value: null,
            max_value: null,
            status: "unsupported_currency",
            evidence_text: snippet.slice(0, 240),
            source_name: corpus.source_name ?? null,
            source_url: corpus.source_url ?? null,
            parser_version: PRICING_PARSER_VERSION,
            extraction_method: "deterministic_text",
            conversion_method: null,
            notes: "Unsupported currency — not converted to ZAR",
          });
        }
        break;
      }
      push(moneyDraft(rule.field, snippet, money, corpus, "deterministic_text"));
      break;
    }
  }

  // Floor size — only when clearly building/floor (never erf alone)
  const floor = normalizeFloorSizeFromText(haystack);
  if (floor) {
    push({
      field_name: "floor_size_m2",
      raw_value: floor.originalText,
      normalized_value: floor.m2,
      currency: null,
      is_approximate: floor.isApproximate,
      is_range: false,
      min_value: null,
      max_value: null,
      status: "extracted",
      evidence_text: floor.originalText.slice(0, 240),
      source_name: corpus.source_name ?? null,
      source_url: corpus.source_url ?? null,
      parser_version: PRICING_PARSER_VERSION,
      extraction_method: "deterministic_text",
      conversion_method: null,
      notes: null,
    });
  } else if (positiveStructured(corpus.floor_size) != null) {
    push({
      field_name: "floor_size_m2",
      raw_value: String(corpus.floor_size),
      normalized_value: corpus.floor_size!,
      currency: null,
      is_approximate: false,
      is_range: false,
      min_value: null,
      max_value: null,
      status: "extracted",
      evidence_text: `floor_size ${corpus.floor_size}`,
      source_name: corpus.source_name ?? null,
      source_url: corpus.source_url ?? null,
      parser_version: PRICING_PARSER_VERSION,
      extraction_method: "structured_field",
      conversion_method: null,
      notes: null,
    });
  }

  const land = normalizeLandSizeObservation(haystack);
  if (land) {
    if (land.hectares != null) {
      push({
        field_name: "total_hectares",
        raw_value: land.originalText,
        normalized_value: land.hectares,
        currency: null,
        is_approximate: land.isApproximate,
        is_range: false,
        min_value: null,
        max_value: null,
        status: land.conversionMethod ? "calculated" : "extracted",
        evidence_text: land.originalText.slice(0, 240),
        source_name: corpus.source_name ?? null,
        source_url: corpus.source_url ?? null,
        parser_version: PRICING_PARSER_VERSION,
        extraction_method: "deterministic_text",
        conversion_method: land.conversionMethod,
        notes: land.acres != null ? `Original acres: ${land.acres}` : null,
      });
    }
    if (land.m2 != null && land.unitDetected === "m2") {
      push({
        field_name: "land_size_m2",
        raw_value: land.originalText,
        normalized_value: land.m2,
        currency: null,
        is_approximate: land.isApproximate,
        is_range: false,
        min_value: null,
        max_value: null,
        status: "extracted",
        evidence_text: land.originalText.slice(0, 240),
        source_name: corpus.source_name ?? null,
        source_url: corpus.source_url ?? null,
        parser_version: PRICING_PARSER_VERSION,
        extraction_method: "deterministic_text",
        conversion_method: null,
        notes: null,
      });
    }
  }

  return out;
}

/**
 * Convert pricing drafts into DD FieldEvidence for the shared extraction pipeline.
 */
export function pricingDraftsToFieldEvidence(
  drafts: PricingObservationDraft[],
  corpus: ExtractionCorpus,
): FieldEvidence[] {
  const out: FieldEvidence[] = [];
  for (const d of drafts) {
    if (d.status === "unsupported_currency") continue;
    const value =
      d.is_range && d.min_value != null && d.max_value != null
        ? `${d.min_value}-${d.max_value}`
        : d.normalized_value;
    if (value == null && !d.is_range) continue;

    const normalized = {
      currency: d.currency,
      is_range: d.is_range,
      min_value: d.min_value,
      max_value: d.max_value,
      parser_version: PRICING_PARSER_VERSION,
      conversion_method: d.conversion_method,
    };

    if (d.extraction_method === "structured_field") {
      const e = structuredEvidence(d.field_name, d.normalized_value, corpus, {
        original_text: d.evidence_text,
      });
      if (e) {
        out.push({
          ...e,
          approximate: d.is_approximate,
          normalized,
        });
      }
    } else {
      if (value == null) continue;
      out.push(
        textEvidence(d.field_name, value, d.evidence_text, corpus, {
          approximate: d.is_approximate,
          normalized,
          requireVerification:
            d.field_name === "starting_bid" ||
            d.field_name === "from_price" ||
            d.status === "needs_verification" ||
            d.status === "anomaly",
        }),
      );
    }
  }
  return out;
}

export function pricingExtractionStatus(
  drafts: PricingObservationDraft[],
): "not_supplied" | "extracted" | "ambiguous" {
  const priceFields = drafts.filter((d) =>
    [
      "auction_price",
      "reserve_price",
      "guide_price",
      "estimated_value",
      "sale_price",
      "starting_bid",
      "from_price",
    ].includes(d.field_name),
  );
  if (priceFields.length === 0) return "not_supplied";
  const fields = new Set(priceFields.map((d) => d.field_name));
  // Ambiguous if both guide and auction extracted with different values from text only
  if (
    fields.has("guide_price") &&
    fields.has("auction_price") &&
    priceFields.filter((d) => d.field_name === "guide_price" || d.field_name === "auction_price")
      .length >= 2
  ) {
    const g = priceFields.find((d) => d.field_name === "guide_price");
    const a = priceFields.find((d) => d.field_name === "auction_price");
    if (
      g?.normalized_value != null &&
      a?.normalized_value != null &&
      g.normalized_value !== a.normalized_value
    ) {
      return "ambiguous";
    }
  }
  return "extracted";
}
