import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import { deriveHi52ExecutionState } from "@/lib/intelligence/historicalIntelligence52";
import type { Hi53ReviewItem } from "./types";

export function buildReviewQueue(events: Hi50EventRow[]): Hi53ReviewItem[] {
  const items: Hi53ReviewItem[] = [];

  for (const e of events) {
    const { state } = deriveHi52ExecutionState(e);

    if (e.resolution === "REVIEW_REQUIRED" || state === "REVIEW_REQUIRED") {
      items.push({
        observationId: e.observationId,
        eventId: e.auctionEventId,
        propertyLabel: e.propertyLabel,
        category: "identity",
        reason: "Identity or resolution requires admin review",
        priority: e.recoveryPriority,
        nextAction: e.nextAction,
      });
    }

    if (e.outcome === "CONFLICT" || state === "CONFLICT" || e.resolution === "CONFLICT") {
      items.push({
        observationId: e.observationId,
        eventId: e.auctionEventId,
        propertyLabel: e.propertyLabel,
        category: "source_conflict",
        reason: "Conflicting outcome or price evidence",
        priority: e.recoveryPriority,
        nextAction: "Review conflict",
      });
    }

    if (e.outcome === "SOLD" && e.salePrice !== "VERIFIED") {
      items.push({
        observationId: e.observationId,
        eventId: e.auctionEventId,
        propertyLabel: e.propertyLabel,
        category: "sale_price",
        reason: "SOLD without verified sale price — SALE_PRICE_REVIEW_REQUIRED",
        priority: e.recoveryPriority,
        nextAction: "Quality Audit — explicit sale evidence only",
      });
    }

    if (
      e.evidenceQuality === "LOW" ||
      e.evidenceQuality === "INSUFFICIENT_DATA" ||
      e.evidenceQuality === "CONFLICT"
    ) {
      items.push({
        observationId: e.observationId,
        eventId: e.auctionEventId,
        propertyLabel: e.propertyLabel,
        category: "evidence_quality",
        reason: `Evidence quality: ${e.evidenceQuality}`,
        priority: e.recoveryPriority,
        nextAction: "Quality Audit (HEQ 4.4)",
      });
    }

    if (
      e.evidenceState === "SOURCE_UNAVAILABLE" ||
      e.recoveryPriority === 4 ||
      state === "FETCH_PERMANENT"
    ) {
      items.push({
        observationId: e.observationId,
        eventId: e.auctionEventId,
        propertyLabel: e.propertyLabel,
        category: "source_unavailable",
        reason: "Source blocked, permanent failure, or unavailable",
        priority: e.recoveryPriority,
        nextAction: e.nextAction || "Review source",
      });
    }

    if (
      (e.extraction === "SUCCESS" || e.extraction === "COMPLETE") &&
      (e.outcome === "UNKNOWN" || e.outcome === "MISSING")
    ) {
      items.push({
        observationId: e.observationId,
        eventId: e.auctionEventId,
        propertyLabel: e.propertyLabel,
        category: "outcome",
        reason: "Extraction complete but outcome unknown — do not infer SOLD",
        priority: e.recoveryPriority,
        nextAction: "Resolve Evidence",
      });
    }
  }

  // Deduplicate by observationId+category
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.observationId}:${item.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
