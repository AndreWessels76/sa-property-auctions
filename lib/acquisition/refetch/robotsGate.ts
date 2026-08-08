import { checkRobotsAllowed, type RobotsDecision } from "@/lib/connectors/biddersChoice/robots";
import type { FetchPolicy } from "./types";

/**
 * Robots / access gate — never bypass.
 * Reuses Bidders Choice robots helper for allowed hosts.
 */
export async function evaluateRobotsGate(input: {
  sourceUrl: string;
  policy: FetchPolicy;
}): Promise<{ allowed: boolean; decision: RobotsDecision | null; reason: string }> {
  let origin: string;
  let path: string;
  try {
    const u = new URL(input.sourceUrl);
    origin = u.origin;
    path = u.pathname || "/";
  } catch {
    return {
      allowed: false,
      decision: null,
      reason: "Invalid source URL",
    };
  }

  const decision = await checkRobotsAllowed(origin, path);
  return {
    allowed: decision.allowed,
    decision,
    reason: decision.reason,
  };
}
