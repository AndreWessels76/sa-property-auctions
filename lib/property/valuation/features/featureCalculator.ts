import { FEATURE_WEIGHTS } from "./featureWeights";
import { PropertyFeatures } from "./featureTypes";

export function calculateFeatureAdjustment(

    features: PropertyFeatures

): number {

    let adjustment = 0;

    Object.entries(features).forEach(([key, enabled]) => {

        if (enabled) {

            adjustment += FEATURE_WEIGHTS[
                key as keyof typeof FEATURE_WEIGHTS
            ] ?? 0;

        }

    });

    return adjustment;

}