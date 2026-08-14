/**
 * Outcome evidence resolver — never infer SOLD from expired/completed (HI 4.2).
 */

import { extractOutcomeFromText } from "@/lib/acquisition/outcomes/outcomeExtractor";
import { validateOutcomeDraft } from "@/lib/acquisition/outcomes/outcomeValidator";
import { isConfirmedOutcome } from "@/lib/intelligence/outcomes/classification";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { OutcomeClassification } from "@/lib/intelligence/outcomes/types";
import type { OutcomeExtractionDraft } from "@/lib/acquisition/outcomes/types";

const NEVER_SOLD_STATES = new Set(["expired", "completed", "removed", "closed"]);

export function resolveOutcomeEvidence(input: {
  observation: HistoricalEventObservation;
  classification: OutcomeClassification;
  sourceText?: string | null;
}): {
  draft: OutcomeExtractionDraft | null;
  outcome: OutcomeClassification["outcome"];
  confirmed: boolean;
  inferredFromExpired: boolean;
} {
  const { observation, classification } = input;
  const listingState = (observation.state ?? "").toLowerCase();
  const verificationState = (observation.verificationState ?? "").toLowerCase();

  if (
    NEVER_SOLD_STATES.has(listingState) ||
    NEVER_SOLD_STATES.has(verificationState)
  ) {
    if (classification.outcome === "SOLD" && !isConfirmedOutcome(classification.outcome)) {
      return {
        draft: null,
        outcome: "UNKNOWN",
        confirmed: false,
        inferredFromExpired: true,
      };
    }
  }

  if (input.sourceText?.trim()) {
    const raw = extractOutcomeFromText(
      input.sourceText,
      {
        title: "",
        description: null,
        source_url: observation.sourceUrl,
        source_name: observation.sourceName,
      },
      {
        verificationState: observation.verificationState,
        listingStatus: observation.state,
      },
    );
    if (!raw) {
      return {
        draft: null,
        outcome: classification.outcome,
        confirmed: classification.confirmed,
        inferredFromExpired: false,
      };
    }
    const { draft } = validateOutcomeDraft(raw);
    return {
      draft,
      outcome: draft.outcome,
      confirmed: isConfirmedOutcome(draft.outcome),
      inferredFromExpired: false,
    };
  }

  return {
    draft: null,
    outcome: classification.outcome,
    confirmed: classification.confirmed,
    inferredFromExpired: false,
  };
}
