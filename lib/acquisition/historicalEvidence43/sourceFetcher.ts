/**
 * Source fetch delegation — licensed refetch only (HEA 4.3).
 */

import type { Hea43SourceCandidate } from "./types";

export type Hea43FetchPlan = {
  propertyId: string;
  sourceUrl: string | null;
  candidate: Hea43SourceCandidate | null;
  licensed: boolean;
  willFetch: boolean;
  reason: string;
};

export function planSourceFetch(input: {
  propertyId: string;
  sourceUrl: string | null;
  candidates: Hea43SourceCandidate[];
  dryRun: boolean;
  licensed: boolean;
}): Hea43FetchPlan {
  const candidate = input.candidates[0] ?? null;

  if (input.dryRun) {
    return {
      propertyId: input.propertyId,
      sourceUrl: input.sourceUrl,
      candidate,
      licensed: input.licensed,
      willFetch: input.licensed && Boolean(input.sourceUrl?.trim()),
      reason: "Dry run — no fetch performed",
    };
  }

  if (!input.licensed) {
    return {
      propertyId: input.propertyId,
      sourceUrl: input.sourceUrl,
      candidate,
      licensed: false,
      willFetch: false,
      reason: "License blocked — no fetch",
    };
  }

  if (!input.sourceUrl?.trim()) {
    return {
      propertyId: input.propertyId,
      sourceUrl: null,
      candidate,
      licensed: input.licensed,
      willFetch: false,
      reason: "No licensed source URL",
    };
  }

  return {
    propertyId: input.propertyId,
    sourceUrl: input.sourceUrl,
    candidate,
    licensed: true,
    willFetch: true,
    reason: "Licensed source fetch planned",
  };
}

export function mapEnrichmentStatusToHea43State(status: string): import("./types").Hea43AcquisitionState {
  switch (status) {
    case "COMPLETED":
      return "EXTRACTED";
    case "NO_CHANGE":
      return "NO_CHANGE";
    case "CONFLICT":
      return "CONFLICT";
    case "SKIPPED_LICENSE":
      return "LICENSE_BLOCKED";
    case "SOURCE_UNAVAILABLE":
      return "SOURCE_NOT_FOUND";
    case "FAILED":
      return "FETCH_FAILED";
    case "SKIPPED_NOT_HISTORICAL":
      return "INSUFFICIENT_DATA";
    default:
      return "UNRESOLVED";
  }
}
