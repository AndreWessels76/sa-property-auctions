/**
 * Force-refresh semantics.
 *
 * force = "fetch now, ignoring schedule/interval"
 * force ≠ "pretend the source changed"
 *
 * same SHA-256 → NO_CHANGE, even when forced.
 */

export type HashChangeDecision = "NO_CHANGE" | "CONTENT_CHANGED";

export function decideChangeFromContentHash(input: {
  previousHash: string | null;
  contentHash: string;
  force?: boolean;
}): HashChangeDecision {
  // force is intentionally unused — it must never override hash equality
  void input.force;
  if (input.previousHash && input.previousHash === input.contentHash) {
    return "NO_CHANGE";
  }
  return "CONTENT_CHANGED";
}

export function shouldCreateSnapshot(decision: HashChangeDecision): boolean {
  return decision === "CONTENT_CHANGED";
}

export function shouldRunExtraction(decision: HashChangeDecision): boolean {
  return decision === "CONTENT_CHANGED";
}
