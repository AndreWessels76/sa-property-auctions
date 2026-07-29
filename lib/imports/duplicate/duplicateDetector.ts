import { PropertyModel } from "../normalizer/PropertyModel";
import { calculateConfidence } from "./calculateConfidence";
import { DuplicateResult } from "./DuplicateTypes";
import { aiDuplicateReview } from "../ai/aiDuplicateReview";

export async function findDuplicate(
    incoming: PropertyModel,
    existingProperties: PropertyModel[]
): Promise<DuplicateResult> {

    let bestScore = 0;
    let bestMatch: PropertyModel | undefined;

    for (const property of existingProperties) {

        const score = calculateConfidence(
            incoming,
            property
        );

        if (score > bestScore) {

            bestScore = score;
            bestMatch = property;

        }

    }

    if (
        bestScore >= 70 &&
        bestScore < 85 &&
        bestMatch
    ) {

        const aiDecision =
            await aiDuplicateReview(
                incoming,
                bestMatch
            );

        return {

            duplicate:
                aiDecision.duplicate,

            confidence:
                aiDecision.confidence,

            existing:
                bestMatch,

        };

    }

    return {

        duplicate: bestScore >= 85,

        confidence: bestScore,

        existing: bestMatch,

    };

}
