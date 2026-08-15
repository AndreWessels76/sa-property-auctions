import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import {
  filterLegacyEligible,
  filterMissingExtraction,
  filterP1Eligible,
} from "@/lib/intelligence/historicalIntelligence52";
import { deriveHi55EventState } from "@/lib/intelligence/historicalIntelligence55";
import { HI56_DEFAULT_BATCH_LIMIT } from "./config";
import { primaryBottleneck56 } from "./bottlenecks";
import type { Hi56Candidate } from "./types";

function clamp(limit?: number): number {
  const n = limit ?? HI56_DEFAULT_BATCH_LIMIT;
  return Math.min(Math.max(n, 1), HI56_DEFAULT_BATCH_LIMIT);
}

function toCandidate(
  e: Hi50EventRow,
  lane: Hi56Candidate["lane"],
  why: string,
  action: string,
): Hi56Candidate {
  return {
    observationId: e.observationId,
    auctionEventId: e.auctionEventId,
    propertyLabel: e.propertyLabel,
    town: e.town,
    sourceStatus: e.sourceStatus,
    sourceUrl: e.sourceUrl,
    priority: e.recoveryPriority,
    currentState: deriveHi55EventState(e),
    recommendedAction: action,
    whyEligible: why,
    lane,
  };
}

/** Next max-5 candidates for the current highest-value bottleneck lane. */
export function buildNextCandidates56(
  events: Hi50EventRow[],
  limit?: number,
): Hi56Candidate[] {
  const capped = clamp(limit);
  const primary = primaryBottleneck56(events);

  if (primary.code === "FETCH_NOT_ATTEMPTED") {
    return filterP1Eligible(events)
      .slice(0, capped)
      .map((e) =>
        toCandidate(
          e,
          "P1",
          "Licensed source — fetch not attempted (P1 eligible)",
          "Acquire P1",
        ),
      );
  }

  if (primary.code === "LEGACY_UNKNOWN_FAILURE") {
    return filterLegacyEligible(events)
      .slice(0, capped)
      .map((e) =>
        toCandidate(
          e,
          "LEGACY",
          `Legacy unknown failure — ${e.errorCode ?? e.failureClassification}`,
          "Retry Legacy",
        ),
      );
  }

  if (primary.code === "MISSING_EXTRACTION") {
    return filterMissingExtraction(events)
      .slice(0, capped)
      .map((e) =>
        toCandidate(
          e,
          "EXTRACTION",
          "Snapshot exists — extract before refetch",
          "Extract Existing Snapshot",
        ),
      );
  }

  // Downstream bottlenecks: surface related review/resolve candidates when present
  if (primary.code === "SALE_PRICE_MISSING") {
    return events
      .filter((e) => e.outcome === "SOLD" && e.salePrice !== "VERIFIED")
      .slice(0, capped)
      .map((e) =>
        toCandidate(
          e,
          "EXTRACTION",
          "SOLD without verified sale price — explicit price evidence required",
          "Quality Audit",
        ),
      );
  }

  return filterP1Eligible(events)
    .slice(0, capped)
    .map((e) =>
      toCandidate(e, "P1", "Fallback P1 eligible", "Acquire P1"),
    );
}

export function buildP1Candidates56(events: Hi50EventRow[], limit?: number): Hi56Candidate[] {
  return filterP1Eligible(events)
    .slice(0, clamp(limit))
    .map((e) =>
      toCandidate(
        e,
        "P1",
        "Licensed source — fetch not attempted (P1 eligible)",
        "Acquire P1",
      ),
    );
}

export function buildLegacyCandidates56(
  events: Hi50EventRow[],
  limit?: number,
): Hi56Candidate[] {
  return filterLegacyEligible(events)
    .slice(0, clamp(limit))
    .map((e) =>
      toCandidate(
        e,
        "LEGACY",
        `Legacy unknown failure — retryable=${e.retryable} · ${e.errorCode ?? e.failureClassification}`,
        "Retry Legacy",
      ),
    );
}
