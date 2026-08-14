/**
 * HSA 4.9 — dry run preview (read-only).
 */

import type { Hea43QueueItem } from "@/lib/acquisition/historicalEvidence43/types";
import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { assignAcquisitionPriority } from "./acquisitionPriority49";
import { buildAcquisitionTimeline } from "./fetchStateMachine";
import type { Hsc48EventDiagnostic } from "./types";

export type Hsa49DryRunCandidate = {
  observationId: string;
  auctionEventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string;
  propertyLabel: string;
  town: string | null;
  agency: string | null;
  sourceUrl: string | null;
  currentState: string;
  acquisitionPriority: number;
  priorityReason: string;
  previousAttempts: number;
  retryable: boolean;
  expectedAction: string;
  timeline: ReturnType<typeof buildAcquisitionTimeline>;
};

export function buildDryRunPreview(input: {
  queueItems: Hea43QueueItem[];
  eventsByProperty: Map<string, Hsc48EventDiagnostic>;
  enrichmentRuns: EnrichmentRunRow[];
  limit: number;
}): {
  candidates: Hsa49DryRunCandidate[];
  counters: {
    candidates: number;
    wouldAttempt: number;
    wouldRetry: number;
    wouldSkip: number;
  };
} {
  const selected = input.queueItems.slice(0, input.limit);
  const candidates: Hsa49DryRunCandidate[] = [];

  for (const item of selected) {
    const event = input.eventsByProperty.get(item.propertyId);
    if (!event) continue;

    const priority = assignAcquisitionPriority({
      event,
      enrichmentRuns: input.enrichmentRuns,
    });

    const expectedAction =
      priority.priority === 1
        ? "Acquire — first fetch attempt"
        : priority.priority === 2
          ? "Retry fetch — retryable error"
          : priority.priority === 3
            ? "Review — source changed"
            : "Skip — permanent failure or complete";

    candidates.push({
      observationId: event.observationId,
      auctionEventId: event.auctionEventId,
      propertyMasterId: event.propertyMasterId,
      listingPropertyId: item.propertyId,
      propertyLabel: event.propertyLabel,
      town: event.town,
      agency: event.agency,
      sourceUrl: item.sourceUrl ?? event.source.sourceUrl,
      currentState: event.primaryState,
      acquisitionPriority: priority.priority,
      priorityReason: priority.reason,
      previousAttempts: priority.attempts,
      retryable: priority.retryable,
      expectedAction,
      timeline: buildAcquisitionTimeline(event, event.fetchError?.errorCode),
    });
  }

  return {
    candidates,
    counters: {
      candidates: candidates.length,
      wouldAttempt: candidates.filter((c) => c.acquisitionPriority <= 2).length,
      wouldRetry: candidates.filter((c) => c.acquisitionPriority === 2).length,
      wouldSkip: candidates.filter((c) => c.acquisitionPriority >= 4).length,
    },
  };
}
