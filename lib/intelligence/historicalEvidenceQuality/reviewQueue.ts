/**
 * Quality review queue (HEQ 4.4).
 */

import type { EvidenceQualityAssessment } from "./types";

export type QualityQueueItem = {
  priority: 1 | 2 | 3 | 4;
  observationId: string;
  auctionEventId: string | null;
  listingPropertyId: string | null;
  propertyMasterId: string | null;
  town: string | null;
  overallQuality: EvidenceQualityAssessment["overallQuality"];
  reason: string;
};

export function buildQualityReviewQueue(
  assessments: EvidenceQualityAssessment[],
  events: Array<{ observationId: string; town: string | null }>,
): QualityQueueItem[] {
  const items: QualityQueueItem[] = [];

  for (const q of assessments) {
    if (!q.reviewRequired || q.reviewPriority == null) continue;
    const event = events.find((e) => e.observationId === q.observationId);
    let reason: string = q.overallQuality;
    if (q.conflicts.length > 0) reason = `Conflict: ${q.conflicts[0]}`;
    else if (q.missingEvidence.includes("sale_price")) reason = "SOLD without verified sale price";
    else if (q.missingEvidence.includes("identity")) reason = "Identity review required";

    items.push({
      priority: q.reviewPriority,
      observationId: q.observationId,
      auctionEventId: q.auctionEventId,
      listingPropertyId: q.listingPropertyId,
      propertyMasterId: q.propertyMasterId,
      town: event?.town ?? null,
      overallQuality: q.overallQuality,
      reason,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export function queueSummary(items: QualityQueueItem[]) {
  return {
    total: items.length,
    p1: items.filter((i) => i.priority === 1).length,
    p2: items.filter((i) => i.priority === 2).length,
    p3: items.filter((i) => i.priority === 3).length,
    p4: items.filter((i) => i.priority === 4).length,
  };
}
