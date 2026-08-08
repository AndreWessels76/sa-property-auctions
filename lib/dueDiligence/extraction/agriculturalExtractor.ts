import type { ExtractionCorpus, FieldEvidence, LandMeasurement } from "./types";
import { structuredEvidence, textEvidence } from "./evidenceBuilder";
import { normalizeLandFromText } from "./normalizer";

function firstCapture(text: string, patterns: RegExp[]): { value: string; match: string } | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]?.trim()) return { value: m[1].trim(), match: m[0] };
  }
  return null;
}

/**
 * Agricultural / farm extraction — only explicit source values.
 */
export function extractAgriculturalFields(
  corpus: ExtractionCorpus,
  text: string,
): { fields: FieldEvidence[]; land: LandMeasurement | null } {
  const out: FieldEvidence[] = [];
  const ag = corpus.agricultural_details ?? {};

  const totalHa =
    typeof ag.totalHectares === "number"
      ? ag.totalHectares
      : typeof ag.total_hectares === "number"
        ? ag.total_hectares
        : null;

  if (totalHa != null && totalHa > 0) {
    const e = structuredEvidence("land_size_hectares", totalHa, corpus);
    if (e) out.push(e);
  }

  let land = normalizeLandFromText(text);

  // Prefer combined extent from text even if structured ha exists — keep original wording
  const combined = text.match(/combined\s*extent\s*[:\-]?[^\n.]{0,40}/i);
  if (combined) {
    const fromCombined = normalizeLandFromText(combined[0]);
    if (fromCombined) land = fromCombined;
  }

  if (land) {
    if (!out.some((e) => e.field === "land_size_hectares") && land.hectares != null) {
      out.push(
        textEvidence("land_size_hectares", land.hectares, land.original_text, corpus, {
          approximate: land.approximate,
          normalized: {
            hectares: land.hectares,
            square_metres: land.square_metres,
            acres: land.acres,
            approximate: land.approximate,
            original_text: land.original_text,
          },
        }),
      );
    }
    out.push(
      textEvidence(
        "land_size_source_text",
        land.original_text,
        land.original_text,
        corpus,
        {
          approximate: land.approximate,
          normalized: {
            hectares: land.hectares,
            square_metres: land.square_metres,
            acres: land.acres,
          },
        },
      ),
    );
    if (land.approximate) {
      out.push(
        textEvidence("land_size_approximate", true, land.original_text, corpus, {
          approximate: true,
        }),
      );
    }
    if (land.square_metres != null) {
      out.push(
        textEvidence("land_size_m2", land.square_metres, land.original_text, corpus, {
          approximate: land.approximate,
        }),
      );
    }
  }

  const farmName = firstCapture(text, [
    /\bfarm\s+name\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9 &'’-]{1,60})/i,
    /\b(?:guest|game)\s+farm\s+([A-Za-z][A-Za-z0-9 &'’-]{1,40})/i,
  ]);
  if (farmName) {
    out.push(
      textEvidence("farm_name", farmName.value.replace(/[,.]$/, ""), farmName.match, corpus),
    );
  }

  const farmNumber = firstCapture(text, [
    /\bfarm\s*(?:no\.?|number|#)\s*[:\-]?\s*([0-9]+(?:\s*\/\s*[0-9]+)?)/i,
  ]);
  if (farmNumber) {
    out.push(textEvidence("farm_number", farmNumber.value, farmNumber.match, corpus));
  }

  const portions = firstCapture(text, [
    /\bfarm\s+portions?\s*[:\-]?\s*([^\n.]{2,80})/i,
    /\bportions?\s*[:\-]?\s*([0-9]+(?:\s*[,&\/]\s*[0-9]+)*)/i,
  ]);
  if (portions) {
    out.push(textEvidence("farm_portions", portions.value, portions.match, corpus));
  }

  // Features — only if explicitly mentioned
  const featureChecks: Array<[string, RegExp]> = [
    ["irrigation", /\birrigat/i],
    ["boreholes", /\bbore\s*holes?\b/i],
    ["dams", /\bdams?\b/i],
    ["grazing", /\bgrazing\b/i],
    ["orchards", /\borchards?\b/i],
    ["crops", /\bcrops?\b/i],
    ["water", /\b(water\s+rights?|river\s+frontage|water\s+supply)\b/i],
  ];
  for (const [field, re] of featureChecks) {
    const m = text.match(re);
    if (m) {
      out.push(textEvidence(field, m[0], m[0], corpus));
    }
  }

  if (typeof ag.farmCategory === "string" && ag.farmCategory.trim()) {
    const e = structuredEvidence("agricultural_type", ag.farmCategory, corpus);
    if (e) out.push(e);
  }

  return { fields: out, land };
}
