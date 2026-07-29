import { PropertyFeatures } from "./featureTypes";

export function buildFeatureReport(

    features: PropertyFeatures

): string[] {

    return Object.entries(features)

        .filter(([, enabled]) => enabled)

        .map(([feature]) => feature);

}
