/**
 * Deterministic outcome extraction from licensed source text.
 * Never infers SOLD from passed dates or listing disappearance.
 */

import { parseMoneyExpression } from "@/lib/acquisition/pricing/pricingParser";
import type { ExtractionCorpus } from "@/lib/dueDiligence/extraction/types";
import type { OutcomeExtractionDraft, OutcomeEvidenceKind, ExtractedOutcomeState } from "./types";

const BLOCKS_SOLD_WITHOUT_EXPLICIT = [
  /\bauction\s+closed\b/i,
  /\bauction\s+completed\b/i,
  /\blisting\s+expired\b/i,
  /\bpage\s+removed\b/i,
  /\bno\s+longer\s+available\b/i,
  /\bunder\s+offer\b/i,
  /\breserve\s+not\s+met\b/i,
];

const EXPLICIT_SOLD_PATTERNS = [
  /\bsold\s+for\b/i,
  /\b(?:property\s+)?sold\b/i,
  /\bsuccessful\s+sale\b/i,
  /\bfinal\s+sale\s+price\b/i,
  /\bhammer\s+price\b/i,
  /\bsuccessful\s+bid\b/i,
];

function blocksSoldInference(haystack: string, snippet: string): boolean {
  const hasExplicitSold = EXPLICIT_SOLD_PATTERNS.some((re) => re.test(haystack));
  if (hasExplicitSold) return false;
  return BLOCKS_SOLD_WITHOUT_EXPLICIT.some((re) => re.test(snippet) || re.test(haystack));
}

const OUTCOME_RULES: Array<{
  outcome: ExtractedOutcomeState;
  confidence: "high" | "medium" | "low";
  evidence_type: OutcomeEvidenceKind;
  patterns: RegExp[];
}> = [
  {
    outcome: "SOLD",
    confidence: "high",
    evidence_type: "SOURCE_EXPLICIT",
    patterns: [
      /\b(?:property\s+)?sold\b/i,
      /\bsold\s+for\b/i,
      /\bstatus\s*[:\-]\s*sold\b/i,
      /\bauction\s+result\s*[:\-]\s*sold\b/i,
      /\bsuccessfully\s+sold\b/i,
      /\bsuccessful\s+sale\b/i,
      /\bknocked\s+down\b/i,
      /\bfinal\s+sale\b/i,
      /\bpurchaser\s+confirmed\b/i,
    ],
  },
  {
    outcome: "WITHDRAWN",
    confidence: "high",
    evidence_type: "SOURCE_EXPLICIT",
    patterns: [
      /\bwithdrawn\b/i,
      /\bstatus\s*[:\-]\s*withdrawn\b/i,
      /\bremoved\s+from\s+auction\b/i,
    ],
  },
  {
    outcome: "CANCELLED",
    confidence: "high",
    evidence_type: "SOURCE_EXPLICIT",
    patterns: [
      /\bcancelled\b/i,
      /\bcanceled\b/i,
      /\bstatus\s*[:\-]\s*cancel/i,
    ],
  },
  {
    outcome: "POSTPONED",
    confidence: "high",
    evidence_type: "SOURCE_EXPLICIT",
    patterns: [
      /\bpostponed\b/i,
      /\bpostpone[ds]?\b/i,
      /\brescheduled\b/i,
      /\bauction\s+moved\b/i,
    ],
  },
  {
    outcome: "PASSED_IN",
    confidence: "medium",
    evidence_type: "SOURCE_RESULT",
    patterns: [
      /\bpassed\s*in\b/i,
      /\bpass[- ]?in\b/i,
      /\bnot\s+sold\b/i,
      /\bno\s+sale\b/i,
      /\bunsold\b/i,
      /\bno\s+acceptable\s+bid\b/i,
      /\bdid\s+not\s+sell\b/i,
    ],
  },
];

const SALE_PRICE_PATTERNS = [
  /(?:sold\s*(?:for|at)|sale\s*price|purchase\s*price|hammer\s*price|final\s*(?:sale\s*)?price|final\s*selling\s*price|winning\s*bid|successful\s*bid(?:\s+of)?|knocked\s*down\s*(?:at|for)?)\s*[:\-]?\s*([^\n;|]{3,60})/i,
];

const REJECT_SALE_CONTEXT = /\b(reserve|guide|estimated|estimate|valuation|starting\s*bid|opening\s*bid|auction\s*price|from\s*price)\b/i;

function extractSalePriceFromText(text: string): {
  value: number | null;
  evidence: string | null;
  confidence: "high" | "medium" | "low" | "none";
} {
  for (const re of SALE_PRICE_PATTERNS) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const snippet = m[0].trim();
    if (REJECT_SALE_CONTEXT.test(snippet.replace(/sold|sale|hammer|winning bid/gi, ""))) {
      continue;
    }
    const money = parseMoneyExpression(m[1]);
    if (!money || money.amount <= 0) continue;
    return {
      value: money.amount,
      evidence: snippet.slice(0, 240),
      confidence: /sold\s*(?:for|at)|hammer|final\s*selling/i.test(snippet) ? "high" : "medium",
    };
  }
  return { value: null, evidence: null, confidence: "none" };
}

export function extractOutcomeFromText(
  text: string,
  corpus: ExtractionCorpus,
  structured?: { verificationState?: string | null; listingStatus?: string | null },
): OutcomeExtractionDraft | null {
  const haystack = text || "";
  if (!haystack.trim()) {
    return {
      outcome: "UNKNOWN",
      confidence: "low",
      evidence_type: "SOURCE_STATUS",
      evidence_text: "No source text supplied",
      source_url: corpus.source_url ?? null,
      source_name: corpus.source_name ?? null,
      extraction_method: "deterministic_text",
      sale_price: null,
      sale_price_evidence: null,
      sale_price_confidence: "none",
      review_required: false,
      review_category: null,
      notes: null,
    };
  }

  let best: OutcomeExtractionDraft | null = null;

  for (const rule of OUTCOME_RULES) {
    for (const re of rule.patterns) {
      const m = haystack.match(re);
      if (!m) continue;
      const snippet = m[0].trim();
      if (rule.outcome === "SOLD" && blocksSoldInference(haystack, snippet)) {
        continue;
      }
      best = {
        outcome: rule.outcome,
        confidence: rule.confidence,
        evidence_type: rule.evidence_type,
        evidence_text: snippet.slice(0, 240),
        source_url: corpus.source_url ?? null,
        source_name: corpus.source_name ?? null,
        extraction_method: "deterministic_text",
        sale_price: null,
        sale_price_evidence: null,
        sale_price_confidence: "none",
        review_required: false,
        review_category: null,
        notes: null,
      };
      break;
    }
    if (best) break;
  }

  const sale = extractSalePriceFromText(haystack);

  if (!best && structured?.verificationState) {
    const vs = structured.verificationState.toLowerCase();
    const map: Record<string, ExtractedOutcomeState> = {
      sold: "SOLD",
      withdrawn: "WITHDRAWN",
      cancelled: "CANCELLED",
      expired: "EXPIRED",
    };
    if (map[vs]) {
      best = {
        outcome: map[vs]!,
        confidence: "medium",
        evidence_type: "SOURCE_STATUS",
        evidence_text: `verification_state: ${vs}`,
        source_url: corpus.source_url ?? null,
        source_name: corpus.source_name ?? null,
        extraction_method: "structured_status",
        sale_price: null,
        sale_price_evidence: null,
        sale_price_confidence: "none",
        review_required: false,
        review_category: null,
        notes: null,
      };
    }
  }

  if (!best) {
    return {
      outcome: "UNKNOWN",
      confidence: "low",
      evidence_type: "SOURCE_STATUS",
      evidence_text: "No explicit outcome evidence in source",
      source_url: corpus.source_url ?? null,
      source_name: corpus.source_name ?? null,
      extraction_method: "deterministic_text",
      sale_price: sale.value,
      sale_price_evidence: sale.evidence,
      sale_price_confidence: sale.confidence,
      review_required: sale.value != null,
      review_category: sale.value != null ? "SALE_PRICE_REVIEW" : null,
      notes: sale.value != null ? "Sale price without explicit outcome — review required" : null,
    };
  }

  if (sale.value != null) {
    best.sale_price = sale.value;
    best.sale_price_evidence = sale.evidence;
    best.sale_price_confidence = sale.confidence;
    if (best.outcome !== "SOLD") {
      best.review_required = true;
      best.review_category = "CONFLICT_REVIEW";
      best.notes = `Outcome ${best.outcome} with sale price evidence — conflict review required`;
    }
  }

  return best;
}
