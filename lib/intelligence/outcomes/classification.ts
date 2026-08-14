/**
 * Deterministic auction outcome classification.
 * Never infer expired→unsold, no price→unsold, or passed date→sold.
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { AuctionOutcomeState } from "./types";

const UNSOLD_MARKERS = /\b(unsold|not sold|no sale|passed in|pass[- ]?in)\b/i;

export function classifyAuctionOutcome(
  row: HistoricalEventObservation,
  extra?: { rawStatus?: string | null; evidenceText?: string | null },
): AuctionOutcomeState {
  const raw = (extra?.rawStatus ?? "").toLowerCase();
  const evidence = extra?.evidenceText ?? "";

  if (raw.includes("postpon") || raw.includes("postpone")) return "POSTPONED";
  if (UNSOLD_MARKERS.test(raw) || UNSOLD_MARKERS.test(evidence)) return "UNSOLD";

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
      return "UNKNOWN";
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
  return outcome === "SOLD" || outcome === "WITHDRAWN" || outcome === "CANCELLED";
}

export function isHistoricalPerformanceOutcome(outcome: AuctionOutcomeState): boolean {
  return (
    outcome === "SOLD" ||
    outcome === "WITHDRAWN" ||
    outcome === "CANCELLED" ||
    outcome === "EXPIRED" ||
    outcome === "UNSOLD" ||
    outcome === "POSTPONED" ||
    outcome === "UNKNOWN"
  );
}

export function outcomeLabel(outcome: AuctionOutcomeState): string {
  return outcome.charAt(0) + outcome.slice(1).toLowerCase().replace("_", " ");
}
