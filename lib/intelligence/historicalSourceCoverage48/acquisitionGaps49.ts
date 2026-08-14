/**
 * HSA 4.9 — acquisition gap grouping for dashboard explainability.
 */

import type { Hsc48EventDiagnostic } from "./types";
import type { Hsa49PriorityAssignment } from "./acquisitionPriority49";

export type Hsa49GapGroup =
  | "MISSING_FETCH"
  | "RETRYABLE_FETCH_FAILURE"
  | "PERMANENT_FETCH_FAILURE"
  | "MISSING_SNAPSHOT"
  | "INVALID_SNAPSHOT"
  | "MISSING_OUTCOME"
  | "MISSING_SALE_PRICE"
  | "IDENTITY_REVIEW"
  | "SIZE_MISSING"
  | "SOURCE_CHANGED";

export type Hsa49EventGapExplanation = {
  observationId: string;
  propertyLabel: string;
  groups: Hsa49GapGroup[];
  marketReadyReason: string;
  priority: number;
};

export function explainEventGaps(input: {
  event: Hsc48EventDiagnostic;
  priority: Hsa49PriorityAssignment;
}): Hsa49EventGapExplanation {
  const groups: Hsa49GapGroup[] = [];

  if (!input.event.fetchAttempted) groups.push("MISSING_FETCH");
  if (
    input.event.fetchAttempted &&
    !input.event.fetchSuccessful &&
    input.priority.retryable
  ) {
    groups.push("RETRYABLE_FETCH_FAILURE");
  }
  if (
    input.event.fetchAttempted &&
    !input.event.fetchSuccessful &&
    !input.priority.retryable
  ) {
    groups.push("PERMANENT_FETCH_FAILURE");
  }
  if (input.event.fetchSuccessful && !input.event.snapshot.exists) {
    groups.push("MISSING_SNAPSHOT");
  }
  if (input.event.snapshot.valid === false) groups.push("INVALID_SNAPSHOT");
  if (input.event.outcomeState === "UNKNOWN") groups.push("MISSING_OUTCOME");
  if (
    input.event.salePriceState === "MISSING" ||
    input.event.salePriceState === "SOLD_WITHOUT_PRICE"
  ) {
    groups.push("MISSING_SALE_PRICE");
  }
  if (input.event.primaryState === "IDENTITY_REVIEW_REQUIRED") {
    groups.push("IDENTITY_REVIEW");
  }
  if (input.event.snapshot.sourceChanged) groups.push("SOURCE_CHANGED");

  const marketReadyReason =
    groups.length === 0
      ? "Evidence chain complete or not required for market intelligence"
      : `Not market-ready: ${groups.map((g) => g.replace(/_/g, " ").toLowerCase()).join(", ")}`;

  return {
    observationId: input.event.observationId,
    propertyLabel: input.event.propertyLabel,
    groups,
    marketReadyReason,
    priority: input.priority.priority,
  };
}

export function groupGapCounts(
  explanations: Hsa49EventGapExplanation[],
): Record<Hsa49GapGroup, number> {
  const counts = {} as Record<Hsa49GapGroup, number>;
  for (const e of explanations) {
    for (const g of e.groups) {
      counts[g] = (counts[g] ?? 0) + 1;
    }
  }
  return counts;
}

export function buildResearchEvidenceLabels(event: Hsc48EventDiagnostic): {
  proven: string[];
  tested: string[];
  missing: string[];
  reviewRequired: string[];
} {
  const proven: string[] = [];
  const tested: string[] = [];
  const missing: string[] = [];
  const reviewRequired: string[] = [];

  if (event.source.sourceUrl) {
    proven.push(`Licensed source URL: ${event.source.sourceUrl}`);
  }
  if (event.fetchAttempted) {
    tested.push(
      `Fetch ${event.fetchSuccessful ? "succeeded" : "failed"}${event.fetch?.httpStatus != null ? ` (HTTP ${event.fetch.httpStatus})` : ""}`,
    );
  } else {
    missing.push("Source fetch not attempted");
  }
  if (event.snapshot.exists) {
    proven.push(`Snapshot ${event.snapshot.snapshotId ? "persisted" : "recorded"}`);
  } else if (event.fetchSuccessful) {
    missing.push("Snapshot not persisted");
  }
  if (event.outcomeState !== "UNKNOWN") {
    proven.push(`Outcome observation: ${event.outcomeState}`);
  } else {
    missing.push("No explicit outcome evidence");
  }
  if (event.salePriceState === "VERIFIED") {
    proven.push("Verified sale price evidence");
  } else {
    missing.push("No verified sale price");
  }
  if (
    event.primaryState === "IDENTITY_REVIEW_REQUIRED" ||
    event.primaryState === "CONFLICT_REVIEW_REQUIRED"
  ) {
    reviewRequired.push(event.stoppingPoint);
  }

  return { proven, tested, missing, reviewRequired };
}
