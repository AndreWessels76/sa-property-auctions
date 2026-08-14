/**
 * Source candidate scoring (HEA 4.3).
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { Hea43SourceCandidate } from "./types";
import type { Hea43SourceTier } from "./config";
import { assessIdentityMatchStrength } from "./identityResolver";

export function scoreSourceCandidate(input: {
  sourceUrl: string;
  event: HistoricalEventObservation;
  exactUrlMatch?: boolean;
  sourceType?: Hea43SourceTier | "UNKNOWN";
  licensed?: boolean;
}): Hea43SourceCandidate {
  const identity = assessIdentityMatchStrength(input.event);
  let score = 0;
  const notes: string[] = [];

  if (input.exactUrlMatch) {
    score += 40;
    notes.push("Exact source URL on auction event");
  }
  if (input.sourceUrl.includes("bidderschoice")) {
    score += 25;
    notes.push("Licensed Bidders Choice connector");
  }
  if (identity.strength === "strong") score += 30;
  else if (identity.strength === "medium") score += 15;
  else {
    score += 5;
    notes.push("Weak identity — review may be required");
  }
  if (input.event.verified) score += 10;

  const licensed = input.licensed ?? Boolean(input.sourceUrl?.trim());

  return {
    sourceUrl: input.sourceUrl,
    sourceType: input.sourceType ?? "UNKNOWN",
    connector: input.sourceUrl.includes("bidderschoice") ? "bidders_choice" : null,
    partner: input.event.agency ?? input.event.sourceName,
    score,
    licensed,
    exactUrlMatch: input.exactUrlMatch ?? false,
    identityStrength: identity.strength,
    notes,
  };
}
