/**
 * Public catalogue policy — pending/seed/archived never shown publicly.
 */
import {
  normalizeVerificationState,
  type VerificationState,
} from "@/lib/data/verificationStates";

/** States allowed on the public website / public APIs. */
export const PUBLIC_VERIFICATION_STATES: VerificationState[] = [
  "verified",
  "sold",
];

export function isPubliclyVisibleVerification(
  verificationState: string | null | undefined,
  dataClassification?: string | null,
): boolean {
  const state = normalizeVerificationState(verificationState);
  if (!state) {
    // Legacy rows without state: never treat as public verified inventory.
    return false;
  }
  if (state === "seed" || state === "pending_verification" || state === "archived") {
    return false;
  }
  if (dataClassification === "seed" || dataClassification === "demo") {
    return false;
  }
  return PUBLIC_VERIFICATION_STATES.includes(state);
}

export function publicVerificationFilter(): string {
  return PUBLIC_VERIFICATION_STATES.join(",");
}
