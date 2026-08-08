import { createHash } from "node:crypto";
import type {
  ExtractionCorpus,
  ExtractionMethod,
  ExtractionVerificationState,
  FieldEvidence,
} from "./types";
import { EXTRACTION_VERSION } from "./types";

export function buildSourceText(corpus: ExtractionCorpus): string {
  return [
    corpus.title,
    corpus.description,
    corpus.features,
    corpus.viewing_information,
    corpus.deposit_requirements,
    corpus.auction_venue,
    corpus.source_page_text,
    corpus.agricultural_details
      ? JSON.stringify(corpus.agricultural_details)
      : null,
  ]
    .filter((x): x is string => Boolean(x && String(x).trim()))
    .join("\n");
}

export function hashSourceContent(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export function evidenceBuilder(input: {
  field: string;
  value: string | number | boolean | null;
  original_text?: string | null;
  source?: string | null;
  source_url?: string | null;
  extraction_method: ExtractionMethod;
  verification_state: ExtractionVerificationState;
  approximate?: boolean;
  normalized?: FieldEvidence["normalized"];
  conflict_with?: string | null;
  extracted_at?: string;
}): FieldEvidence {
  return {
    field: input.field,
    value: input.value,
    original_text: input.original_text ?? null,
    source: input.source ?? null,
    source_url: input.source_url ?? null,
    extraction_method: input.extraction_method,
    extracted_at: input.extracted_at ?? new Date().toISOString(),
    verification_state: input.verification_state,
    approximate: input.approximate,
    normalized: input.normalized,
    conflict_with: input.conflict_with ?? null,
  };
}

export function structuredEvidence(
  field: string,
  value: string | number | boolean | null | undefined,
  corpus: ExtractionCorpus,
  opts?: { original_text?: string | null },
): FieldEvidence | null {
  if (value == null || (typeof value === "string" && !value.trim())) {
    return null;
  }
  const listingVerified = corpus.verification_state === "verified";
  return evidenceBuilder({
    field,
    value: typeof value === "string" ? value.trim() : value,
    original_text: opts?.original_text ?? String(value),
    source: corpus.source_name ?? null,
    source_url: corpus.source_url ?? null,
    extraction_method: "structured_field",
    verification_state: listingVerified ? "verified" : "source_confirmed",
  });
}

export function textEvidence(
  field: string,
  value: string | number | boolean,
  matchText: string,
  corpus: ExtractionCorpus,
  opts?: {
    approximate?: boolean;
    normalized?: FieldEvidence["normalized"];
    requireVerification?: boolean;
  },
): FieldEvidence {
  const listingVerified = corpus.verification_state === "verified";
  const state: ExtractionVerificationState = opts?.requireVerification
    ? "extracted_not_yet_verified"
    : listingVerified
      ? "source_confirmed"
      : "extracted_not_yet_verified";

  return evidenceBuilder({
    field,
    value,
    original_text: matchText,
    source: corpus.source_name ?? null,
    source_url: corpus.source_url ?? null,
    extraction_method: "deterministic_text",
    verification_state: state,
    approximate: opts?.approximate,
    normalized: opts?.normalized,
  });
}

export function extractionMeta() {
  return {
    extraction_version: EXTRACTION_VERSION,
    extracted_at: new Date().toISOString(),
  };
}
