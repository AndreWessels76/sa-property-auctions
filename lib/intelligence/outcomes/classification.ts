/**
 * Deterministic auction outcome classification.
 * Never infer expired→passed-in, no price→sold, or passed date→sold.
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { AuctionOutcomeState } from "./types";

const PASSED_IN_MARKERS = /\b(unsold|not sold|no sale|passed in|pass[- ]?in)\b/i;

export function classifyAuctionOutcome(
  row: HistoricalEventObservation,
  extra?: { rawStatus?: string | null; evidenceText?: string | null },
): AuctionOutcomeState {
  const raw = (extra?.rawStatus ?? "").toLowerCase();
  const evidence = extra?.evidenceText ?? "";

  if (raw.includes("postpon") || raw.includes("postpone")) return "POSTPONED";
  if (PASSED_IN_MARKERS.test(raw) || PASSED_IN_MARKERS.test(evidence)) return "PASSED_IN";

  switch (row.state) {
    case "sold":
      return "SOLD";
    case "withdrawn":
      return "WITHDRAWN";
    case "cancelled":
      return "CANCELLED";
    case "expired":
      return "EXPIRED";
    case "completed":
      return "COMPLETED_UNKNOWN";
    case "unknown":
      return "UNKNOWN";
    case "upcoming":
    case "live":
      return "UNKNOWN";
    default:
      return "UNKNOWN";
  }
}

export function isConfirmedOutcome(outcome: AuctionOutcomeState): boolean {
  return (
    outcome === "SOLD" ||
    outcome === "WITHDRAWN" ||
    outcome === "CANCELLED" ||
    outcome === "PASSED_IN"
  );
}

export function isHistoricalPerformanceOutcome(outcome: AuctionOutcomeState): boolean {
  return (
    outcome === "SOLD" ||
    outcome === "WITHDRAWN" ||
    outcome === "CANCELLED" ||
    outcome === "EXPIRED" ||
    outcome === "PASSED_IN" ||
    outcome === "POSTPONED" ||
    outcome === "COMPLETED_UNKNOWN" ||
    outcome === "UNKNOWN"
  );
}

export function outcomeLabel(outcome: AuctionOutcomeState): string {
  return outcome.charAt(0) + outcome.slice(1).toLowerCase().replace(/_/g, " ");
}

/** Map persisted DB outcome strings to intelligence states. */
export function normalizePersistedOutcome(outcome: string): AuctionOutcomeState {
  if (outcome === "UNSOLD") return "PASSED_IN";
  const allowed: AuctionOutcomeState[] = [
    "SOLD",
    "WITHDRAWN",
    "CANCELLED",
    "EXPIRED",
    "PASSED_IN",
    "POSTPONED",
    "COMPLETED_UNKNOWN",
    "UNKNOWN",
  ];
  return allowed.includes(outcome as AuctionOutcomeState)
    ? (outcome as AuctionOutcomeState)
    : "UNKNOWN";
}
