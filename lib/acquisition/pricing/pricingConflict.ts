/**
 * Pricing conflict detection — never silently overwrite verified values.
 */

import type {
  PricingConflictRecord,
  PricingFieldName,
  PricingObservationDraft,
  PricingObservationStatus,
} from "./types";

export type ExistingPricingObservation = {
  field_name: string;
  normalized_value: number | null;
  status: string;
  source_name: string | null;
  evidence_text: string | null;
  is_range?: boolean;
  min_value?: number | null;
  max_value?: number | null;
};

function valuesDiffer(
  a: ExistingPricingObservation,
  b: PricingObservationDraft,
): boolean {
  if (a.is_range || b.is_range) {
    return (
      String(a.min_value ?? "") !== String(b.min_value ?? "") ||
      String(a.max_value ?? "") !== String(b.max_value ?? "")
    );
  }
  if (a.normalized_value == null && b.normalized_value == null) return false;
  return Number(a.normalized_value) !== Number(b.normalized_value);
}

/**
 * Compare new drafts against existing observations for the same property+field.
 * Verified existing → conflict (do not auto-replace).
 */
export function detectPricingConflicts(input: {
  existing: ExistingPricingObservation[];
  incoming: PricingObservationDraft[];
}): PricingConflictRecord[] {
  const conflicts: PricingConflictRecord[] = [];
  const byField = new Map<string, ExistingPricingObservation>();
  for (const e of input.existing) {
    // Prefer verified / source_confirmed as the protected baseline
    const cur = byField.get(e.field_name);
    if (!cur) {
      byField.set(e.field_name, e);
      continue;
    }
    const rank = (s: string) =>
      s === "verified" ? 3 : s === "source_confirmed" ? 2 : s === "conflict" ? 1 : 0;
    if (rank(e.status) >= rank(cur.status)) byField.set(e.field_name, e);
  }

  for (const draft of input.incoming) {
    const prev = byField.get(draft.field_name);
    if (!prev) continue;
    if (!valuesDiffer(prev, draft)) continue;

    const protectedStatus =
      prev.status === "verified" || prev.status === "source_confirmed";

    if (protectedStatus) {
      conflicts.push({
        field_name: draft.field_name as PricingFieldName,
        old_value: prev.normalized_value,
        new_value: draft.normalized_value,
        old_status: prev.status,
        new_status: draft.status,
        old_source: prev.source_name,
        new_source: draft.source_name,
        old_evidence: prev.evidence_text,
        new_evidence: draft.evidence_text,
        message: `Protected ${prev.status} ${draft.field_name} differs from new source observation — admin review required`,
      });
      draft.status = "conflict" as PricingObservationStatus;
    }
  }

  return conflicts;
}

export type AdminPricingAction =
  | "approve"
  | "reject"
  | "keep_existing"
  | "mark_conflict"
  | "request_refetch";

export function resolveAdminPricingAction(
  action: AdminPricingAction,
): { observationStatus: PricingObservationStatus | null; note: string } {
  switch (action) {
    case "approve":
      return { observationStatus: "verified", note: "Admin approved new observation" };
    case "reject":
      return { observationStatus: "rejected", note: "Admin rejected new observation" };
    case "keep_existing":
      return {
        observationStatus: "rejected",
        note: "Admin kept existing verified value",
      };
    case "mark_conflict":
      return { observationStatus: "conflict", note: "Admin marked conflict" };
    case "request_refetch":
      return { observationStatus: null, note: "Admin requested source re-fetch" };
  }
}
