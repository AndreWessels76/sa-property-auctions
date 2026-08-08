import { extractAgriculturalFields } from "./agriculturalExtractor";
import { extractAuctionFields } from "./auctionExtractor";
import { extractDocuments } from "./documentExtractor";
import {
  buildSourceText,
  extractionMeta,
  hashSourceContent,
} from "./evidenceBuilder";
import { extractLegalFields } from "./legalExtractor";
import { extractLocationFields } from "./locationExtractor";
import { extractPropertyFields } from "./propertyExtractor";
import {
  detectConflicts,
  missingKeyFields,
  selectDisplayFields,
  scoreCompleteness,
} from "./sourceExtractor";
import type { ExtractionCorpus, ExtractionResult } from "./types";
import { EXTRACTION_VERSION } from "./types";

/**
 * Source Extraction Engine — deterministic pipeline:
 * SOURCE → DISCOVER → EXTRACT → NORMALIZE → EVIDENCE → VERIFY → STORE → DISPLAY
 *
 * No AI. No fabrication. Idempotent by source_hash + field key.
 */
export function runDueDiligenceExtraction(
  corpus: ExtractionCorpus,
): ExtractionResult {
  const meta = extractionMeta();
  const text = buildSourceText(corpus);
  const source_hash = hashSourceContent(text || JSON.stringify(corpus));

  const propertyFields = extractPropertyFields(corpus, text);
  const auctionFields = extractAuctionFields(corpus, text);
  const locationFields = extractLocationFields(corpus, text);
  const { fields: agriFields, land } = extractAgriculturalFields(corpus, text);
  const { documents, fields: docFields } = extractDocuments(corpus, text);
  const legalFields = extractLegalFields(corpus, text);

  const all = [
    ...propertyFields,
    ...auctionFields,
    ...locationFields,
    ...agriFields,
    ...docFields,
    ...legalFields,
  ];

  const conflicts = detectConflicts(all);
  const fields = selectDisplayFields(all, conflicts);
  const completeness = scoreCompleteness(fields);

  const fields_from_structured = fields.filter(
    (f) => f.extraction_method === "structured_field",
  ).length;
  const fields_from_text = fields.filter(
    (f) => f.extraction_method === "deterministic_text",
  ).length;

  return {
    extraction_version: EXTRACTION_VERSION,
    extracted_at: meta.extracted_at,
    source_hash,
    fields,
    documents,
    conflicts,
    land,
    completeness,
    stats: {
      fields_found: fields.length,
      fields_from_text,
      fields_from_structured,
      documents_found: documents.length,
      conflicts: conflicts.length,
      missing_key_fields: missingKeyFields(fields),
    },
  };
}

/** Alias for module naming convention */
export const extractionService = {
  run: runDueDiligenceExtraction,
};
