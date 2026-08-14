/**
 * Pricing Data Acquisition — currency & number parsing.
 * Parser version: pricing-parser-1.0.0
 *
 * Never invents values. Unsupported currencies are rejected.
 */

export const PRICING_PARSER_VERSION = "pricing-parser-1.0.0";

export type ParsedMoney = {
  amount: number;
  currency: "ZAR";
  isApproximate: boolean;
  isRange: boolean;
  minValue: number | null;
  maxValue: number | null;
  originalText: string;
};

const ACRE_TO_HECTARES = 0.40468564224;

/** Strip common wrappers but keep digits, separators, and decimal marks for analysis. */
function prepare(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasNonZarCurrency(text: string): boolean {
  return /(?:\b(?:USD|EUR|GBP|AUD)\b|\$|€|£)/i.test(text);
}

/**
 * Parse a single ZAR amount from SA and international thousand/decimal styles.
 * Returns null when unparseable or non-ZAR.
 */
export function parseZarAmount(raw: string): number | null {
  const text = prepare(raw);
  if (!text) return null;
  if (hasNonZarCurrency(text)) return null;

  // million / m shorthand: R2.5 million, R2,5m, R2.5m
  const million = text.match(
    /(?:R|ZAR)?\s*([\d]+(?:[.,]\d+)?)\s*(?:million|mil)\b/i,
  );
  if (million) {
    const n = Number(million[1]!.replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : null;
  }
  const mShort = text.match(/(?:R|ZAR)?\s*([\d]+(?:[.,]\d+)?)\s*m\b/i);
  if (mShort && !/\bm2\b|\bm²\b/i.test(text)) {
    const n = Number(mShort[1]!.replace(",", "."));
    // Only treat as millions when value looks like a price shorthand (< 1000)
    if (Number.isFinite(n) && n > 0 && n < 1000) {
      return Math.round(n * 1_000_000);
    }
  }

  let s = text.replace(/ZAR/gi, "").replace(/R/gi, "").trim();

  // SA style with decimal comma: 2 500 000,00 or 2500000,50
  if (/^\d{1,3}(?:[ \u00a0]\d{3})+(,\d{1,2})$/.test(s) || /^\d+,\d{1,2}$/.test(s)) {
    s = s.replace(/[ \u00a0]/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  // US/UK style: 2,500,000.00 or 2,500,000
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  // Spaces as thousands: 2 500 000 or 2 500 000.00
  if (/^\d{1,3}(?:[ \u00a0]\d{3})+(?:\.\d+)?$/.test(s)) {
    s = s.replace(/[ \u00a0]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  // Plain digits / decimal
  s = s.replace(/[^\d.]/g, "");
  if (!s) return null;
  // Ambiguous multiple dots — reject
  if ((s.match(/\./g) ?? []).length > 1) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseMoneyExpression(raw: string): ParsedMoney | null {
  const text = prepare(raw);
  if (!text) return null;
  if (hasNonZarCurrency(text)) return null;

  const approximate = /[±~≈]|approx(?:imate(?:ly)?)?/i.test(text);

  // Range: R2m – R2.5m / R2,000,000 - R2,500,000
  const range = text.match(
    /((?:R|ZAR)?\s*[\d][\d\s.,]*\s*(?:million|mil|m)?)\s*(?:–|-|—|to)\s*((?:R|ZAR)?\s*[\d][\d\s.,]*\s*(?:million|mil|m)?)/i,
  );
  if (range) {
    const minValue = parseZarAmount(range[1]!);
    const maxValue = parseZarAmount(range[2]!);
    if (minValue == null || maxValue == null) return null;
    return {
      amount: minValue,
      currency: "ZAR",
      isApproximate: approximate,
      isRange: true,
      minValue,
      maxValue,
      originalText: text,
    };
  }

  const amount = parseZarAmount(text);
  if (amount == null) return null;

  return {
    amount,
    currency: "ZAR",
    isApproximate: approximate,
    isRange: false,
    minValue: null,
    maxValue: null,
    originalText: text,
  };
}

export function acresToHectares(acres: number): number {
  return acres * ACRE_TO_HECTARES;
}

export { ACRE_TO_HECTARES };
