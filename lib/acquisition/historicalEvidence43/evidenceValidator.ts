/**
 * Evidence validation for HEA 4.3 acquisition objects.
 */

import { createHash } from "crypto";
import type { Hea43EvidenceObject } from "./types";

export type EvidenceQuality = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

export function hashEvidenceText(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  return createHash("sha256").update(text.trim()).digest("hex");
}

export function buildEvidenceObject(input: {
  eventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
  sourceUrl: string | null;
  sourceSnapshotId: string | null;
  sourceType: string | null;
  sourcePublishedAt?: string | null;
  fetchedAt?: string | null;
  evidenceText: string | null;
  extractedOutcome: string | null;
  extractedSalePrice: number | null;
  confidence?: string | null;
  identityConfidence?: string | null;
}): Hea43EvidenceObject {
  return {
    eventId: input.eventId,
    propertyMasterId: input.propertyMasterId,
    listingPropertyId: input.listingPropertyId,
    sourceUrl: input.sourceUrl,
    sourceSnapshotId: input.sourceSnapshotId,
    sourceType: input.sourceType,
    sourcePublishedAt: input.sourcePublishedAt ?? null,
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    evidenceText: input.evidenceText,
    evidenceHash: hashEvidenceText(input.evidenceText),
    extractedOutcome: input.extractedOutcome,
    extractedSalePrice: input.extractedSalePrice,
    confidence: input.confidence ?? null,
    identityConfidence: input.identityConfidence ?? null,
  };
}

export function assessEvidenceQuality(evidence: Hea43EvidenceObject | null): EvidenceQuality {
  if (!evidence?.evidenceText?.trim()) return "INSUFFICIENT";
  if (!evidence.evidenceHash) return "INSUFFICIENT";

  const hasOutcome = Boolean(evidence.extractedOutcome && evidence.extractedOutcome !== "UNKNOWN");
  const hasPrice = evidence.extractedSalePrice != null;
  const identity = (evidence.identityConfidence ?? "").toUpperCase();

  if (hasOutcome && hasPrice && identity === "HIGH") return "HIGH";
  if (hasOutcome && (hasPrice || identity === "HIGH" || identity === "MEDIUM")) return "MEDIUM";
  if (hasOutcome) return "LOW";
  return "INSUFFICIENT";
}

export function evidenceSufficientForVerification(quality: EvidenceQuality): boolean {
  return quality === "HIGH" || quality === "MEDIUM";
}
