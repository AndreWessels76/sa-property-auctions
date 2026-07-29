import { calculateFeatureAdjustment } from "./featureCalculator";
import { applyFeatureAdjustment } from "./featureAdjustments";
import { PropertyFeatures } from "./featureTypes";

export function adjustPropertyValue(

    estimatedValue: number,

    features: PropertyFeatures

) {

    const adjustment =

        calculateFeatureAdjustment(features);

    return applyFeatureAdjustment(

        estimatedValue,

        adjustment

    );

}
