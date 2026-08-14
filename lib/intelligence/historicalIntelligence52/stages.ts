import { HI52_DEFAULT_BATCH_LIMIT } from "./config";
import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi52StageSummary } from "./types";
import { deriveHi52ExecutionState } from "./executionState";

export function filterP1Eligible(events: Hi50EventRow[]): Hi50EventRow[] {
  return events.filter((e) => {
    const { state } = deriveHi52ExecutionState(e);
    return state === "FETCH_ELIGIBLE_P1";
  });
}

export function filterLegacyEligible(events: Hi50EventRow[]): Hi50EventRow[] {
  return events.filter((e) => {
    const { state } = deriveHi52ExecutionState(e);
    return state === "LEGACY_UNKNOWN_FAILURE";
  });
}

export function filterMissingExtraction(events: Hi50EventRow[]): Hi50EventRow[] {
  return events.filter((e) => {
    const { state } = deriveHi52ExecutionState(e);
    return state === "MISSING_EXTRACTION" || (e.snapshot && e.extraction === "NOT_RUN");
  });
}

export function buildStageSummaries(input: {
  events: Hi50EventRow[];
  p1Processed?: number;
  batchSize?: number;
}): Hi52StageSummary[] {
  const batchSize = input.batchSize ?? HI52_DEFAULT_BATCH_LIMIT;
  const p1 = filterP1Eligible(input.events);
  const legacy = filterLegacyEligible(input.events);
  const missing = filterMissingExtraction(input.events);
  const p1Processed = input.p1Processed ?? 0;

  const needsResolution = input.events.filter(
    (e) =>
      e.extraction === "SUCCESS" ||
      e.outcome === "SOLD" ||
      e.outcome === "FOUND" ||
      e.evidenceState === "OUTCOME_FOUND" ||
      e.evidenceState === "EXTRACTION_AVAILABLE",
  ).length;

  return [
    {
      id: "A_P1",
      label: "P1 Unattempted Recovery",
      eligible: p1.length,
      nextBatch: Math.min(batchSize, p1.length),
      processed: p1Processed,
      remaining: p1.length,
      recommendedAction: p1.length > 0 ? "Dry Run P1 (5) → Acquire P1 (5)" : "P1 complete",
    },
    {
      id: "B_LEGACY",
      label: "Legacy Failure Recovery",
      eligible: legacy.length,
      nextBatch: Math.min(batchSize, legacy.length),
      processed: 0,
      remaining: legacy.length,
      recommendedAction:
        legacy.length > 0
          ? "Dry Run Legacy (5) → Retry Legacy Failures (5)"
          : "No legacy failures",
    },
    {
      id: "C_EXTRACTION",
      label: "Existing Snapshot Extraction",
      eligible: missing.length,
      nextBatch: Math.min(batchSize, missing.length),
      processed: 0,
      remaining: missing.length,
      recommendedAction:
        missing.length > 0
          ? "Dry Run Extraction (5) → Extract Existing Snapshots (5)"
          : "No missing extractions",
    },
    {
      id: "D_RESOLUTION",
      label: "Resolution & Quality Rebuild",
      eligible: needsResolution,
      nextBatch: Math.min(batchSize, needsResolution),
      processed: 0,
      remaining: needsResolution,
      recommendedAction: "Resolve Evidence → Quality Audit → Rebuild Intelligence",
    },
  ];
}
