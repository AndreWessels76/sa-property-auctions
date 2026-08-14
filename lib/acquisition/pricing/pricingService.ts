/**
 * Pricing Data Acquisition service — extract → validate → conflict → persist.
 * Hooks into Live Source Re-fetch CONTENT_CHANGED path (idempotent).
 */

import "server-only";

import {
  buildSourceText,
  hashSourceContent,
} from "@/lib/dueDiligence/extraction/evidenceBuilder";
import type { ExtractionCorpus } from "@/lib/dueDiligence/extraction/types";
import { LoggerService } from "@/lib/logger";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import {
  PricingObservationRepository,
  type PricingObservationRow,
} from "@/lib/repositories/PricingObservationRepository";
import {
  detectPricingConflicts,
  resolveAdminPricingAction,
  type AdminPricingAction,
} from "./pricingConflict";
import { buildPricingEvidenceSnippet } from "./pricingEvidence";
import {
  extractPricingObservations,
  pricingExtractionStatus,
} from "./pricingExtractor";
import { PRICING_PARSER_VERSION } from "./pricingParser";
import {
  isPricingNotSupplied,
  validatePricingDrafts,
} from "./pricingValidator";
import type { PricingObservationDraft } from "./types";

export type PersistPricingInput = {
  propertyId: string;
  propertyMasterId?: string | null;
  auctionEventId?: string | null;
  corpus: ExtractionCorpus & {
    auction_price?: number | null;
    reserve_price?: number | null;
    estimated_value?: number | null;
  };
  sourcePageText?: string | null;
  sourceSnapshotId?: string | null;
  contentHash?: string | null;
  extractionRunId?: string | null;
  /** When true (NO_CHANGE), skip re-extraction persistence. */
  skipBecauseNoChange?: boolean;
};

export type PersistPricingResult = {
  skipped: boolean;
  reason: string | null;
  status: "not_supplied" | "extracted" | "ambiguous" | "no_change" | "persisted";
  drafts: PricingObservationDraft[];
  conflicts: number;
  observationIds: string[];
  parserVersion: string;
};

export function runPricingExtraction(
  corpus: PersistPricingInput["corpus"],
  sourcePageText?: string | null,
): {
  drafts: PricingObservationDraft[];
  status: "not_supplied" | "extracted" | "ambiguous";
  issues: string[];
  sourceHash: string;
} {
  const text = [
    buildSourceText(corpus),
    sourcePageText,
  ]
    .filter(Boolean)
    .join("\n");

  const raw = extractPricingObservations(corpus, text);
  const validated = validatePricingDrafts(raw);
  const status = isPricingNotSupplied(validated.drafts)
    ? "not_supplied"
    : pricingExtractionStatus(validated.drafts);

  return {
    drafts: validated.drafts,
    status,
    issues: validated.issues,
    sourceHash: hashSourceContent(text || JSON.stringify(corpus)),
  };
}

export async function persistPricingObservations(
  input: PersistPricingInput,
): Promise<PersistPricingResult> {
  if (input.skipBecauseNoChange) {
    return {
      skipped: true,
      reason: "NO_CHANGE",
      status: "no_change",
      drafts: [],
      conflicts: 0,
      observationIds: [],
      parserVersion: PRICING_PARSER_VERSION,
    };
  }

  const { drafts, status, sourceHash } = runPricingExtraction(
    input.corpus,
    input.sourcePageText,
  );

  const contentHash = input.contentHash ?? sourceHash;

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

  if (status === "not_supplied") {
    LoggerService.audit("pricing.extraction.not_supplied", {
      propertyId: input.propertyId,
      parserVersion: PRICING_PARSER_VERSION,
      contentHash,
    });
    return {
      skipped: false,
      reason: "Pricing not supplied by source",
      status: "not_supplied",
      drafts: [],
      conflicts: 0,
      observationIds: [],
      parserVersion: PRICING_PARSER_VERSION,
    };
  }

  const existing = await PricingObservationRepository.listByProperty(
    input.propertyId,
  );

  const conflicts = detectPricingConflicts({
    existing: existing.map((e) => ({
      field_name: e.field_name,
      normalized_value: e.normalized_value,
      status: e.status,
      source_name: e.source_name,
      evidence_text: e.evidence_text,
      is_range: e.is_range,
      min_value: e.min_value,
      max_value: e.max_value,
    })),
    incoming: drafts,
  });

  const observationIds: string[] = [];

  for (const draft of drafts) {
    const row = await PricingObservationRepository.insertObservation({
      property_id: input.propertyId,
      property_master_id: masterId,
      auction_event_id: auctionEventId,
      source_snapshot_id: input.sourceSnapshotId ?? null,
      extraction_run_id: input.extractionRunId ?? null,
      field_name: draft.field_name,
      raw_value: draft.raw_value,
      normalized_value: draft.normalized_value,
      currency: draft.currency,
      is_approximate: draft.is_approximate,
      is_range: draft.is_range,
      min_value: draft.min_value,
      max_value: draft.max_value,
      status: draft.status,
      evidence_text: buildPricingEvidenceSnippet(draft),
      source_name: draft.source_name,
      source_url: draft.source_url,
      parser_version: draft.parser_version,
      extraction_method: draft.extraction_method,
      conversion_method: draft.conversion_method,
      content_hash: contentHash,
      notes: draft.notes,
    });
    if (row?.id) observationIds.push(row.id);
  }

  for (const c of conflicts) {
    const oldObs = existing.find(
      (e) =>
        e.field_name === c.field_name &&
        (e.status === "verified" || e.status === "source_confirmed"),
    );
    const newObsId =
      observationIds[
        drafts.findIndex((d) => d.field_name === c.field_name)
      ] ?? null;

    await PricingObservationRepository.insertConflict({
      property_id: input.propertyId,
      field_name: c.field_name,
      old_observation_id: oldObs?.id ?? null,
      new_observation_id: newObsId,
      old_value: c.old_value,
      new_value: c.new_value,
      old_source: c.old_source,
      new_source: c.new_source,
      old_evidence: c.old_evidence,
      new_evidence: c.new_evidence,
    });
  }

  LoggerService.audit("pricing.extraction.persisted", {
    propertyId: input.propertyId,
    observationCount: observationIds.length,
    conflicts: conflicts.length,
    status,
    contentHash,
    parserVersion: PRICING_PARSER_VERSION,
  });

  return {
    skipped: false,
    reason: null,
    status: "persisted",
    drafts,
    conflicts: conflicts.length,
    observationIds,
    parserVersion: PRICING_PARSER_VERSION,
  };
}

export async function applyPricingAdminAction(input: {
  action: AdminPricingAction;
  observationId?: string;
  conflictId?: string;
  operator: string;
}): Promise<{ ok: boolean; message: string }> {
  const resolved = resolveAdminPricingAction(input.action);

  if (input.action === "request_refetch") {
    return {
      ok: true,
      message: resolved.note,
    };
  }

  if (input.observationId && resolved.observationStatus) {
    await PricingObservationRepository.updateObservationStatus(
      input.observationId,
      resolved.observationStatus,
      { verifiedBy: input.operator, notes: resolved.note },
    );
  }

  if (input.conflictId) {
    const status =
      input.action === "approve"
        ? "approved_new"
        : input.action === "keep_existing"
          ? "kept_existing"
          : input.action === "reject"
            ? "rejected"
            : "resolved";
    await PricingObservationRepository.resolveConflict(
      input.conflictId,
      status,
      input.operator,
      resolved.note,
    );
  }

  return { ok: true, message: resolved.note };
}

/**
 * Prefer verified / source_confirmed observations for intelligence overlays.
 * Never invents values when observations are absent.
 */
export function overlayPricingFromObservations(
  base: {
    auction_price?: number | null;
    reserve_price?: number | null;
    estimated_value?: number | null;
    floor_size?: number | null;
  },
  observations: PricingObservationRow[],
): {
  auction_price: number | null;
  reserve_price: number | null;
  estimated_value: number | null;
  guide_price: number | null;
  floor_size: number | null;
  total_hectares: number | null;
  total_hectares_approximate: boolean;
  conflictDetected: boolean;
} {
  const pick = (field: string): PricingObservationRow | null => {
    const candidates = observations.filter(
      (o) =>
        o.field_name === field &&
        (o.status === "verified" ||
          o.status === "source_confirmed" ||
          o.status === "extracted" ||
          o.status === "calculated") &&
        !o.is_range &&
        o.normalized_value != null &&
        o.normalized_value > 0,
    );
    const rank = (s: string) =>
      s === "verified" ? 3 : s === "source_confirmed" ? 2 : 1;
    candidates.sort((a, b) => rank(b.status) - rank(a.status));
    return candidates[0] ?? null;
  };

  const usable = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) && n > 0 ? n : null;

  const auctionObs = pick("auction_price");
  const reserveObs = pick("reserve_price");
  const estimateObs = pick("estimated_value");
  const guideObs = pick("guide_price");
  const floorObs = pick("floor_size_m2");
  const haObs = pick("total_hectares");

  return {
    auction_price: usable(base.auction_price) ?? auctionObs?.normalized_value ?? null,
    reserve_price: usable(base.reserve_price) ?? reserveObs?.normalized_value ?? null,
    estimated_value:
      usable(base.estimated_value) ?? estimateObs?.normalized_value ?? null,
    guide_price: guideObs?.normalized_value ?? null,
    floor_size: usable(base.floor_size) ?? floorObs?.normalized_value ?? null,
    total_hectares: haObs?.normalized_value ?? null,
    total_hectares_approximate: haObs?.is_approximate ?? false,
    conflictDetected: observations.some((o) => o.status === "conflict"),
  };
}
