/**
 * DATA FOUNDATION 2.0 — verification & listing lifecycle vocabulary.
 */

export type VerificationState =
  | "seed"
  | "pending_verification"
  | "verified"
  | "expired"
  | "withdrawn"
  | "sold"
  | "archived";

export const VERIFICATION_STATE_LABELS: Record<VerificationState, string> = {
  seed: "Seed",
  pending_verification: "Pending Verification",
  verified: "Verified",
  expired: "Expired",
  withdrawn: "Withdrawn",
  sold: "Sold",
  archived: "Archived",
};

export function normalizeVerificationState(
  value: string | null | undefined,
): VerificationState | null {
  if (!value) return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (v === "seed") return "seed";
  if (v === "pending_verification" || v === "pending" || v === "needs_verification") {
    return "pending_verification";
  }
  if (v === "verified" || v === "production") return "verified";
  if (v === "expired") return "expired";
  if (v === "withdrawn") return "withdrawn";
  if (v === "sold") return "sold";
  if (v === "archived" || v === "demo") return "archived";
  return null;
}

export function formatVerificationLabel(
  value: string | null | undefined,
): string {
  const state = normalizeVerificationState(value);
  if (!state) return "Pending Verification";
  return VERIFICATION_STATE_LABELS[state];
}

export type ImportPipelineStage =
  | "discover"
  | "download"
  | "normalize"
  | "validate"
  | "deduplicate"
  | "merge"
  | "verify"
  | "publish"
  | "archive";

export const IMPORT_PIPELINE_STAGES: ImportPipelineStage[] = [
  "discover",
  "download",
  "normalize",
  "validate",
  "deduplicate",
  "merge",
  "verify",
  "publish",
  "archive",
];

export type ListingLifecycleStatus =
  | "upcoming"
  | "live"
  | "sold"
  | "withdrawn"
  | "expired"
  | "archived";

export function normalizeLifecycleStatus(
  value: string | null | undefined,
): ListingLifecycleStatus | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "upcoming") return "upcoming";
  if (v === "live" || v === "active") return "live";
  if (v === "sold") return "sold";
  if (v === "withdrawn" || v === "cancelled" || v === "canceled") {
    return "withdrawn";
  }
  if (v === "expired") return "expired";
  if (v === "archived" || v === "completed" || v === "closed") return "archived";
  return null;
}

export function formatLifecycleLabel(
  value: string | null | undefined,
): string {
  const status = normalizeLifecycleStatus(value);
  if (!status) return "Status not listed";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
