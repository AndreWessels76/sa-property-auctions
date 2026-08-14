/**
 * Outcome extraction — delegates to licensed outcome extractor (HEA 4.3).
 */

export {
  extractOutcomeFromText,
} from "@/lib/acquisition/outcomes/outcomeExtractor";

export type {
  OutcomeExtractionDraft,
  ExtractedOutcomeState,
} from "@/lib/acquisition/outcomes/types";
