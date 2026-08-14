/**
 * Outcome observation persistence — extract → validate → conflict → persist.
 * Mirrors pricing acquisition idempotency pattern.
 */

import "server-only";

import {
  buildSourceText,
  hashSourceContent,
} from "@/lib/dueDiligence/extraction/evidenceBuilder";
import type { ExtractionCorpus } from "@/lib/dueDiligence/extraction/types";
import { LoggerService } from "@/lib/logger";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { OutcomeIntelligenceRepository } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { extractOutcomeFromText } from "./outcomeExtractor";
import { validateOutcomeDraft } from "./outcomeValidator";
import { detectOutcomeObservationConflicts } from "./outcomeConflict";
import { OUTCOME_EXTRACTION_VERSION } from "./types";
import type { OutcomeExtractionDraft } from "./types";

export type PersistOutcomeInput = {
  propertyId: string;
  propertyMasterId?: string | null;
  auctionEventId?: string | null;
  corpus: ExtractionCorpus & {
    verification_state?: string | null;
    listing_status?: string | null;
  };
  sourcePageText?: string | null;
  sourceSnapshotId?: string | null;
  contentHash?: string | null;
  enrichmentRunId?: string | null;
  operator?: string | null;
  skipBecauseNoChange?: boolean;
};

export type PersistOutcomeResult = {
  skipped: boolean;
  reason: string | null;
  status: "not_supplied" | "persisted" | "no_change" | "review_required" | "conflict";
  draft: OutcomeExtractionDraft | null;
  observationId: string | null;
  conflicts: number;
  reviews: number;
};

export function runOutcomeExtraction(
  corpus: PersistOutcomeInput["corpus"],
  sourcePageText?: string | null,
): { draft: OutcomeExtractionDraft | null; sourceHash: string } {
  const text = [buildSourceText(corpus), sourcePageText].filter(Boolean).join("\n");
  const draft = extractOutcomeFromText(text, corpus, {
    verificationState: corpus.verification_state ?? null,
    listingStatus: corpus.listing_status ?? null,
  });
  return {
    draft,
    sourceHash: hashSourceContent(text || JSON.stringify(corpus)),
  };
}

export async function persistOutcomeObservations(
  input: PersistOutcomeInput,
): Promise<PersistOutcomeResult> {
  if (input.skipBecauseNoChange) {
    return {
      skipped: true,
      reason: "NO_CHANGE",
      status: "no_change",
      draft: null,
      observationId: null,
      conflicts: 0,
      reviews: 0,
    };
  }

  const { draft: raw, sourceHash } = runOutcomeExtraction(
    input.corpus,
    input.sourcePageText,
  );
  const contentHash = input.contentHash ?? sourceHash;

  if (!raw) {
    return {
      skipped: false,
      reason: "No outcome evidence in source",
      status: "not_supplied",
      draft: null,
      observationId: null,
      conflicts: 0,
      reviews: 0,
    };
  }

  const { draft, issues } = validateOutcomeDraft(raw);

  let masterId = input.propertyMasterId ?? null;
  let auctionEventId = input.auctionEventId ?? null;
  if (!masterId || !auctionEventId) {
    try {
      const row = await PropertyRepository.getById(input.propertyId);
      masterId = masterId ?? row?.property_master_id ?? null;
    } catch {
      /* soft-fail */
    }
  }

  const idempotencyKey = OutcomeIntelligenceRepository.buildIdempotencyKey({
    property_id: input.propertyId,
    auction_event_id: auctionEventId,
    content_hash: contentHash,
    outcome: draft.outcome,
    version: OUTCOME_EXTRACTION_VERSION,
  });

  if (idempotencyKey) {
    const existing = await OutcomeIntelligenceRepository.findIdempotent(idempotencyKey);
    if (existing) {
      return {
        skipped: true,
        reason: "Idempotent observation already exists",
        status: "no_change",
        draft,
        observationId: existing.id,
        conflicts: 0,
        reviews: 0,
      };
    }
  }

  const prior = await OutcomeIntelligenceRepository.listByProperty(input.propertyId);
  const conflictDrafts = detectOutcomeObservationConflicts({
    existing: prior,
    incoming: draft,
  });

  const row = await OutcomeIntelligenceRepository.insertObservation({
    property_master_id: masterId,
    auction_event_id: auctionEventId,
    listing_property_id: input.propertyId,
    outcome: draft.outcome,
    confidence: draft.confidence,
    evidence_types: [draft.evidence_type],
    source_url: draft.source_url,
    source_snapshot_id: input.sourceSnapshotId ?? null,
    source_hash: contentHash,
    source_timestamp: new Date().toISOString(),
    evidence_text: draft.evidence_text,
    evidence_type: draft.evidence_type,
    extraction_method: draft.extraction_method,
    sale_price: draft.sale_price,
    sale_price_source: draft.source_name,
    sale_price_observed_at: draft.sale_price != null ? new Date().toISOString() : null,
    sale_price_confidence: draft.sale_price_confidence,
    calculation_version: OUTCOME_EXTRACTION_VERSION,
    idempotency_key: idempotencyKey,
    enrichment_run_id: input.enrichmentRunId ?? null,
    observed_at: new Date().toISOString(),
    review_category: draft.review_category,
  });

  let reviews = 0;
  if (draft.review_required && row?.id) {
    await HistoricalEnrichmentRepository.insertReview({
      category: draft.review_category ?? "OUTCOME_REVIEW",
      property_id: input.propertyId,
      property_master_id: masterId,
      auction_event_id: auctionEventId,
      outcome_observation_id: row.id,
      source_url: draft.source_url,
      snapshot_id: input.sourceSnapshotId ?? null,
      source_hash: contentHash,
      evidence_text: draft.evidence_text,
      extracted_value: draft.outcome,
      normalized_value: draft.sale_price != null ? String(draft.sale_price) : null,
      confidence: draft.confidence,
    });
    reviews += 1;
  }

  for (const c of conflictDrafts) {
    await OutcomeIntelligenceRepository.insertConflict({
      property_master_id: masterId,
      auction_event_id: auctionEventId,
      source_a: c.source_a,
      source_b: c.source_b,
      claim_a: c.claim_a,
      claim_b: c.claim_b,
      evidence_a: c.evidence_a,
      evidence_b: c.evidence_b,
    });
    await HistoricalEnrichmentRepository.insertReview({
      category: "CONFLICT_REVIEW",
      property_id: input.propertyId,
      property_master_id: masterId,
      auction_event_id: auctionEventId,
      outcome_observation_id: row?.id ?? null,
      source_url: draft.source_url,
      snapshot_id: input.sourceSnapshotId ?? null,
      source_hash: contentHash,
      evidence_text: `${c.claim_a} vs ${c.claim_b}`,
      extracted_value: c.claim_b,
      normalized_value: null,
      confidence: "medium",
    });
    reviews += 1;
  }

  LoggerService.audit("outcome.extraction.persisted", {
    propertyId: input.propertyId,
    outcome: draft.outcome,
    salePrice: draft.sale_price,
    conflicts: conflictDrafts.length,
    reviews,
    contentHash,
    issues,
  });

  const persistedStatus =
    conflictDrafts.length > 0
      ? "conflict"
      : draft.review_required
        ? "review_required"
        : "persisted";

  if (
    persistedStatus === "persisted" &&
    draft.outcome === "SOLD" &&
    draft.sale_price != null &&
    (draft.sale_price_confidence === "high" || draft.sale_price_confidence === "medium")
  ) {
    try {
      const { HistoricalIntelligence40Service } = await import(
        "@/lib/services/HistoricalIntelligence40Service"
      );
      await HistoricalIntelligence40Service.rebuild(
        input.operator ?? "outcome_sale_price_persist",
      );
    } catch {
      /* soft-fail — rebuild can be triggered manually */
    }
  }

  return {
    skipped: false,
    reason: null,
    status: persistedStatus,
    draft,
    observationId: row?.id ?? null,
    conflicts: conflictDrafts.length,
    reviews,
  };
}
