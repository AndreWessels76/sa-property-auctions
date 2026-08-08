import type { ExtractionCorpus, FieldEvidence } from "./types";
import { structuredEvidence, textEvidence } from "./evidenceBuilder";

/**
 * Property description extraction — deterministic regex only.
 * Only store values explicitly supported by source text / structured fields.
 */

function firstCapture(text: string, patterns: RegExp[]): { value: string; match: string } | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]?.trim()) {
      return { value: m[1].trim(), match: m[0] };
    }
  }
  return null;
}

export function extractPropertyFields(
  corpus: ExtractionCorpus,
  text: string,
): FieldEvidence[] {
  const out: FieldEvidence[] = [];
  const push = (e: FieldEvidence | null) => {
    if (e) out.push(e);
  };

  // Structured fields first (stronger than text)
  push(structuredEvidence("bedrooms", corpus.bedrooms, corpus));
  push(structuredEvidence("bathrooms", corpus.bathrooms, corpus));
  push(structuredEvidence("garages", corpus.garages, corpus));
  push(structuredEvidence("property_type", corpus.property_type, corpus));
  push(structuredEvidence("floor_size", corpus.floor_size, corpus));
  push(structuredEvidence("erf_size", corpus.erf_size, corpus));
  push(
    structuredEvidence("property_description", corpus.description, corpus, {
      original_text: corpus.description?.slice(0, 280) ?? null,
    }),
  );

  const has = (field: string) => out.some((e) => e.field === field);

  if (!has("bedrooms")) {
    const bed = firstCapture(text, [
      /(\d+)\s*[-–]?\s*bed(?:room)?s?\b/i,
      /\bbedrooms?\s*[:\-]?\s*(\d+)/i,
    ]);
    if (bed) {
      const n = Number(bed.value);
      if (Number.isFinite(n) && n > 0 && n < 50) {
        out.push(textEvidence("bedrooms", n, bed.match, corpus));
      }
    }
  }

  if (!has("bathrooms")) {
    const bath = firstCapture(text, [
      /(\d+(?:\.\d+)?)\s*[-–]?\s*bath(?:room)?s?\b/i,
      /\bbathrooms?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]);
    if (bath) {
      const n = Number(bath.value);
      if (Number.isFinite(n) && n > 0 && n < 50) {
        out.push(textEvidence("bathrooms", n, bath.match, corpus));
      }
    }
  }

  if (!has("garages")) {
    const gar = firstCapture(text, [
      /(\d+)\s*[-–]?\s*garage/i,
      /\bgarages?\s*[:\-]?\s*(\d+)/i,
    ]);
    if (gar) {
      const n = Number(gar.value);
      if (Number.isFinite(n) && n >= 0 && n < 30) {
        out.push(textEvidence("garages", n, gar.match, corpus));
      }
    }
  }

  // Parking (bays)
  const parking = firstCapture(text, [
    /(\d+)\s*(?:parking|car)\s*(?:bay|bays|space|spaces)/i,
    /\bparking\s*[:\-]?\s*(\d+)/i,
  ]);
  if (parking) {
    const n = Number(parking.value);
    if (Number.isFinite(n) && n >= 0 && n < 100) {
      out.push(textEvidence("parking", n, parking.match, corpus));
    }
  }

  // Sectional title / scheme — "SS The Orchards" or "sectional title scheme X"
  const scheme = firstCapture(text, [
    /\bSS\s+([A-Za-z0-9][A-Za-z0-9 &'’-]{1,60})/i,
    /sectional\s+title\s+scheme\s+[:\-]?\s*([A-Za-z0-9][A-Za-z0-9 &'’-]{1,60})/i,
    /\bscheme\s+[:\-]?\s*([A-Za-z0-9][A-Za-z0-9 &'’-]{1,60})/i,
  ]);
  if (scheme) {
    out.push(textEvidence("scheme", scheme.value.replace(/[,.]$/, ""), scheme.match, corpus));
  }

  // Unit number
  const unit = firstCapture(text, [
    /\bunit\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z0-9\-\/]+)/i,
    /\bunit\s+([A-Za-z0-9\-\/]{1,12})\b/i,
  ]);
  if (unit && !/in|at|for|of/i.test(unit.value)) {
    out.push(textEvidence("unit_number", unit.value, unit.match, corpus));
  }

  // Erf / Portion
  const erf = firstCapture(text, [
    /\berf\s*(?:no\.?|number|#)?\s*[:\-]?\s*([0-9]+(?:\s*\/\s*[0-9]+)?)/i,
  ]);
  if (erf) {
    out.push(textEvidence("erf_number", erf.value.replace(/\s+/g, ""), erf.match, corpus));
  }

  const portion = firstCapture(text, [
    /\bportion\s*(?:no\.?|number|#)?\s*[:\-]?\s*([0-9]+)/i,
  ]);
  if (portion) {
    out.push(textEvidence("portion_number", portion.value, portion.match, corpus));
  }

  // Floor / land from text if structured missing
  if (!has("floor_size")) {
    const floor = firstCapture(text, [
      /(?:floor|building)\s*(?:area|size)?\s*[:\-]?\s*([\d]+(?:[.,]\d+)?)\s*(?:m²|m2|sqm)/i,
      /([\d]+(?:[.,]\d+)?)\s*(?:m²|m2)\s*(?:floor|building)/i,
    ]);
    if (floor) {
      const n = Number(floor.value.replace(",", "."));
      if (Number.isFinite(n) && n > 0) {
        out.push(textEvidence("floor_size", n, floor.match, corpus));
      }
    }
  }

  // Property type hints from text when structured missing
  if (!has("property_type")) {
    if (/\b(sectional\s*title|unit)\b/i.test(text) || /\bSS\b/.test(text)) {
      const m = text.match(/\b(sectional\s*title|unit|SS)\b/i);
      if (m) {
        out.push(
          textEvidence(
            "property_type",
            /unit|ss|sectional/i.test(m[0]) ? "Unit" : m[0],
            m[0],
            corpus,
          ),
        );
      }
    } else if (/\b(farm|smallholding|agricultural)\b/i.test(text)) {
      const m = text.match(/\b(guest\s*farm|game\s*farm|farm|smallholding)\b/i);
      if (m) {
        out.push(textEvidence("property_type", m[0], m[0], corpus));
      }
    } else if (/\b(commercial|industrial|warehouse|office)\b/i.test(text)) {
      const m = text.match(/\b(commercial|industrial|warehouse|office)\b/i);
      if (m) out.push(textEvidence("property_type", m[0], m[0], corpus));
    } else if (/\b(vacant\s*land|stand)\b/i.test(text)) {
      const m = text.match(/\b(vacant\s*land|stand)\b/i);
      if (m) out.push(textEvidence("property_type", m[0], m[0], corpus));
    }
  }

  // Development / building name — do not match "Insolvent Estate"
  const development = firstCapture(text, [
    /(?:development|complex)\s+(?:name\s*)?[:\-]?\s*([A-Za-z0-9][A-Za-z0-9 &'’-]{2,60})/i,
  ]);
  if (development) {
    out.push(
      textEvidence(
        "development_name",
        development.value.replace(/[,.]$/, ""),
        development.match,
        corpus,
      ),
    );
  }

  return out;
}
