/**
 * Backfill identity decisions — stricter than forward import.
 * Title-only matches never auto-attach. Uncertain → review queue.
 */

import type { IdentityMatchResult } from "@/lib/identity/identityMatch";
import type { BackfillIdentityDecision, BackfillIdentityResult } from "./types";

export function resolveBackfillIdentityDecision(input: {
  match: IdentityMatchResult;
  signalCount: number;
  alreadyLinked: boolean;
  locationFlags: string[];
}): BackfillIdentityResult {
  const { match, signalCount, alreadyLinked, locationFlags } = input;
  const base = {
    fingerprint: match.fingerprint,
    fingerprintComponents: match.fingerprintComponents,
    confidence: match.confidence,
    signals: match.signals,
    notes: [...match.notes],
    matchedMasterId: match.matchedMasterId,
  };

  if (alreadyLinked) {
    return {
      ...base,
      decision: "ALREADY_LINKED",
      autoAttach: true,
    };
  }

  if (locationFlags.includes("LOCATION_DATA_REVIEW") && signalCount < 3) {
    return {
      ...base,
      decision: "IDENTITY_REVIEW_REQUIRED",
      autoAttach: false,
      notes: [...base.notes, "Location data flagged for review."],
    };
  }

  if (match.signals.includes("fingerprint_exact") || match.matchClass === "same") {
    return {
      ...base,
      decision: "MATCH_CONFIRMED",
      autoAttach: true,
    };
  }

  if (match.matchClass === "likely_same") {
    const strongNonTitle = match.signals.filter((s) => s !== "title");
    if (strongNonTitle.length === 0) {
      return {
        ...base,
        decision: "MATCH_REVIEW",
        autoAttach: false,
        notes: [...base.notes, "Title-only likely match — review required."],
      };
    }
    return {
      ...base,
      decision: "MATCH_HIGH_CONFIDENCE",
      autoAttach: true,
    };
  }

  if (match.matchClass === "possible_duplicate") {
    return {
      ...base,
      decision: "MATCH_REVIEW",
      autoAttach: false,
      notes: [...base.notes, "Possible duplicate — admin review required."],
    };
  }

  if (match.matchClass === "new" && signalCount >= 2) {
    return {
      ...base,
      decision: "NEW_MASTER",
      autoAttach: true,
      matchedMasterId: null,
    };
  }

  if (signalCount < 2) {
    return {
      ...base,
      decision: "INSUFFICIENT_EVIDENCE",
      autoAttach: false,
      notes: [...base.notes, "Fewer than two identity signals."],
    };
  }

  return {
    ...base,
    decision: "MATCH_REJECTED",
    autoAttach: false,
    matchedMasterId: null,
    notes: [...base.notes, "No safe identity match."],
  };
}

export function identityDecisionToAuditStatus(
  decision: BackfillIdentityDecision,
  created: boolean,
): import("./types").BackfillAuditStatus {
  if (decision === "ALREADY_LINKED") return "MASTER_MATCHED";
  if (decision === "MATCH_CONFIRMED" || decision === "MATCH_HIGH_CONFIDENCE") {
    return created ? "MASTER_CREATED" : "MASTER_MATCHED";
  }
  if (decision === "NEW_MASTER") return "MASTER_CREATED";
  if (decision === "MATCH_REVIEW" || decision === "IDENTITY_REVIEW_REQUIRED") {
    return "MASTER_REVIEW";
  }
  if (decision === "INSUFFICIENT_EVIDENCE") return "INSUFFICIENT_EVIDENCE";
  return "MASTER_SKIPPED";
}

export function isAutoAttachDecision(decision: BackfillIdentityDecision): boolean {
  return (
    decision === "MATCH_CONFIRMED" ||
    decision === "MATCH_HIGH_CONFIDENCE" ||
    decision === "NEW_MASTER" ||
    decision === "ALREADY_LINKED"
  );
}
